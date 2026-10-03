use anyhow::Result;
use core_daemon::grpc::{DaemonServiceClient, Empty};
use tokio_stream::StreamExt;

#[tokio::main]
async fn main() -> Result<()> {
    println!("Connecting to ClearWire Daemon on http://[::1]:50051...");
    let mut client = DaemonServiceClient::connect("http://[::1]:50051").await?;
    println!("Connected! Streaming live network events (press Ctrl+C to exit):\n");

    let response = client.stream_traffic(Empty {}).await?;
    let mut stream = response.into_inner();

    while let Some(event) = stream.next().await {
        match event {
            Ok(e) => {
                println!(
                    "[{}] PID: {:<6} Process: {:<16} -> {}:{:<5} Action: {}",
                    e.protocol,
                    e.pid,
                    e.process_name,
                    e.destination_ip,
                    e.destination_port,
                    e.action
                );
            }
            Err(status) => {
                eprintln!("gRPC stream error: {}", status);
                break;
            }
        }
    }

    Ok(())
}
