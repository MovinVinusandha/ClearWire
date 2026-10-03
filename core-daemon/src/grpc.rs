use std::pin::Pin;
use tokio::sync::{broadcast, mpsc};
use tokio_stream::wrappers::ReceiverStream;
use tokio_stream::Stream;
use tonic::{Request, Response, Status};

#[allow(clippy::result_large_err)]
pub mod clearwire {
    tonic::include_proto!("clearwire.v1");
}

pub use clearwire::daemon_service_client::DaemonServiceClient;
use clearwire::daemon_service_server::DaemonService;
pub use clearwire::daemon_service_server::DaemonServiceServer;
pub use clearwire::{Empty, TrafficEvent};

#[derive(Debug, Clone)]
pub struct DaemonServiceImpl {
    tx: broadcast::Sender<TrafficEvent>,
}

impl Default for DaemonServiceImpl {
    fn default() -> Self {
        let (tx, _) = broadcast::channel(1024);
        Self { tx }
    }
}

impl DaemonServiceImpl {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn broadcast(
        &self,
        event: TrafficEvent,
    ) -> Result<usize, broadcast::error::SendError<TrafficEvent>> {
        self.tx.send(event)
    }

    pub fn sender(&self) -> broadcast::Sender<TrafficEvent> {
        self.tx.clone()
    }
}

#[tonic::async_trait]
impl DaemonService for DaemonServiceImpl {
    type StreamTrafficStream =
        Pin<Box<dyn Stream<Item = Result<TrafficEvent, Status>> + Send + 'static>>;

    async fn stream_traffic(
        &self,
        _request: Request<Empty>,
    ) -> Result<Response<Self::StreamTrafficStream>, Status> {
        let mut bcast_rx = self.tx.subscribe();
        let (tx, rx) = mpsc::channel(128);

        tokio::spawn(async move {
            loop {
                match bcast_rx.recv().await {
                    Ok(event) => {
                        if tx.send(Ok(event)).await.is_err() {
                            // Receiver dropped, stop streaming
                            break;
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(_)) => {
                        // Consumer was slower than ring buffer events; continue with latest
                        continue;
                    }
                    Err(broadcast::error::RecvError::Closed) => {
                        break;
                    }
                }
            }
        });

        let output_stream = ReceiverStream::new(rx);
        Ok(Response::new(Box::pin(output_stream)))
    }
}
