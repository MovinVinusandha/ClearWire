use std::pin::Pin;
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;
use tokio_stream::Stream;
use tonic::{Request, Response, Status};

pub mod clearwire {
    tonic::include_proto!("clearwire.v1");
}

use clearwire::daemon_service_server::DaemonService;
pub use clearwire::daemon_service_client::DaemonServiceClient;
pub use clearwire::daemon_service_server::DaemonServiceServer;
pub use clearwire::{Empty, TrafficEvent};

#[derive(Debug, Default)]
pub struct DaemonServiceImpl;

#[tonic::async_trait]
impl DaemonService for DaemonServiceImpl {
    type StreamTrafficStream =
        Pin<Box<dyn Stream<Item = Result<TrafficEvent, Status>> + Send + 'static>>;

    async fn stream_traffic(
        &self,
        _request: Request<Empty>,
    ) -> Result<Response<Self::StreamTrafficStream>, Status> {
        let (tx, rx) = mpsc::channel(32);

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(1));
            let mut bytes_sent: u64 = 0;
            let mut bytes_received: u64 = 0;

            loop {
                interval.tick().await;

                bytes_sent = bytes_sent.saturating_add(512);
                bytes_received = bytes_received.saturating_add(1024);

                let event = TrafficEvent {
                    pid: 1234,
                    process_name: "firefox".to_string(),
                    destination_ip: "1.1.1.1".to_string(),
                    destination_port: 443,
                    protocol: "TCP".to_string(),
                    bytes_sent,
                    bytes_received,
                    action: "ALLOW".to_string(),
                };

                if tx.send(Ok(event)).await.is_err() {
                    // Receiver dropped, stop streaming
                    break;
                }
            }
        });

        let output_stream = ReceiverStream::new(rx);
        Ok(Response::new(Box::pin(output_stream)))
    }
}
