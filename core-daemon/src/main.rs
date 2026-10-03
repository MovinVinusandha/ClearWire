use anyhow::Result;
use tonic::transport::Server;

mod grpc;
use grpc::{DaemonServiceImpl, DaemonServiceServer};

#[tokio::main]
async fn main() -> Result<()> {
    let addr = "[::1]:50051".parse()?;
    let daemon_service = DaemonServiceImpl::default();

    println!("Starting ClearWire Daemon gRPC server on {}", addr);

    Server::builder()
        .add_service(DaemonServiceServer::new(daemon_service))
        .serve(addr)
        .await?;

    Ok(())
}
