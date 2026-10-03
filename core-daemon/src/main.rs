use anyhow::{Context, Result};
use aya::maps::RingBuf;
use aya::programs::{CgroupAttachMode, CgroupSockAddr};
use aya::Ebpf;
use core_daemon::grpc::{DaemonServiceImpl, DaemonServiceServer, TrafficEvent};
use core_daemon_common::NetworkEvent;
use std::fs::File;
use std::net::Ipv4Addr;
use tokio::io::unix::AsyncFd;
use tonic::transport::Server;

#[tokio::main]
async fn main() -> Result<()> {
    // 7. Load compiled eBPF bytecode
    let mut ebpf = Ebpf::load(aya::include_bytes_aligned!(concat!(
        env!("OUT_DIR"),
        "/core-daemon-ebpf"
    )))
    .context("Failed to load eBPF bytecode")?;

    // Attach cgroup_sock_addr program to v2 cgroup root (/sys/fs/cgroup)
    let cgroup_file = File::open("/sys/fs/cgroup").context("Failed to open /sys/fs/cgroup")?;
    let program: &mut CgroupSockAddr = ebpf
        .program_mut("connect4")
        .context("eBPF program 'connect4' not found")?
        .try_into()
        .context("Failed to cast eBPF program to CgroupSockAddr")?;
    program.load().context("Failed to load eBPF program")?;
    program
        .attach(cgroup_file, CgroupAttachMode::Single)
        .context("Failed to attach connect4 program to /sys/fs/cgroup")?;

    println!("eBPF connect4 probe successfully attached to /sys/fs/cgroup");

    // Initialize the shared gRPC service
    let daemon_service = DaemonServiceImpl::new();
    let service_clone = daemon_service.clone();

    // 8. Spawn an async Tokio task to poll the RingBuf from userspace
    let ring_buf = RingBuf::try_from(
        ebpf.take_map("EVENTS")
            .context("EVENTS RingBuf map not found in eBPF bytecode")?,
    )
    .context("Failed to create RingBuf from EVENTS map")?;
    let mut async_fd = AsyncFd::new(ring_buf).context("Failed to create AsyncFd for RingBuf")?;

    tokio::spawn(async move {
        loop {
            let mut guard = match async_fd.readable_mut().await {
                Ok(guard) => guard,
                Err(err) => {
                    eprintln!("Failed to await readability on RingBuf: {}", err);
                    break;
                }
            };

            let ring_buf = guard.get_inner_mut();
            while let Some(item) = ring_buf.next() {
                // 9. When NetworkEvent is received, convert dest_ip into standard IPv4 string
                if let Some(event) = NetworkEvent::from_bytes(&item) {
                    let destination_ip = Ipv4Addr::from(event.dest_ip).to_string();
                    let process_name = std::fs::read_to_string(format!("/proc/{}/comm", event.pid))
                        .map(|s| s.trim().to_string())
                        .unwrap_or_else(|_| "unknown".to_string());

                    let action = if event.action == 0 {
                        "BLOCK".to_string()
                    } else {
                        "ALLOW".to_string()
                    };

                    println!(
                        "[Intercepted] PID: {:<6} Process: {:<16} -> {}:{:<5} [{}]",
                        event.pid, process_name, destination_ip, event.dest_port, action
                    );

                    let traffic_event = TrafficEvent {
                        pid: event.pid,
                        process_name,
                        destination_ip,
                        destination_port: event.dest_port as u32,
                        protocol: "TCP".to_string(),
                        bytes_sent: 0,
                        bytes_received: 0,
                        action,
                    };

                    let _ = service_clone.broadcast(traffic_event);
                }
            }

            guard.clear_ready();
        }
    });

    let addr = "[::1]:50051".parse()?;
    println!("Starting ClearWire Daemon gRPC server on {}", addr);

    Server::builder()
        .add_service(DaemonServiceServer::new(daemon_service))
        .serve_with_shutdown(addr, async {
            if let Err(err) = tokio::signal::ctrl_c().await {
                eprintln!("Failed to listen for ctrl+c signal: {}", err);
            }
            println!("Shutdown signal received, shutting down gRPC server...");
        })
        .await?;

    println!("ClearWire Daemon stopped cleanly.");
    Ok(())
}
