use anyhow::Result;
use core_daemon::grpc::{DaemonServiceImpl, DaemonServiceServer};
use tonic::transport::Server;

#[tokio::main]
async fn main() -> Result<()> {
    let addr = "[::1]:50051".parse()?;
    let daemon_service = DaemonServiceImpl::default();

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
