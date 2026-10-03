use core_daemon::grpc::{
    DaemonServiceClient, DaemonServiceImpl, DaemonServiceServer, Empty, TrafficEvent,
};
use std::time::Duration;
use tokio::net::TcpListener;
use tokio_stream::wrappers::TcpListenerStream;
use tokio_stream::StreamExt;
use tonic::transport::Server;

#[tokio::test]
async fn test_grpc_stream_traffic() {
    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .expect("failed to bind ephemeral port");
    let local_addr = listener.local_addr().expect("failed to get local addr");

    let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel::<()>();
    let daemon_service = DaemonServiceImpl::new();
    let service_clone = daemon_service.clone();

    let server_handle = tokio::spawn(async move {
        Server::builder()
            .add_service(DaemonServiceServer::new(daemon_service))
            .serve_with_incoming_shutdown(TcpListenerStream::new(listener), async {
                let _ = shutdown_rx.await;
            })
            .await
            .expect("server failed");
    });

    let channel_endpoint = format!("http://{}", local_addr);
    let channel = tonic::transport::Endpoint::from_shared(channel_endpoint)
        .expect("valid endpoint")
        .connect_lazy();

    let mut client = DaemonServiceClient::new(channel);

    let response = tokio::time::timeout(Duration::from_secs(5), client.stream_traffic(Empty {}))
        .await
        .expect("RPC call timed out")
        .expect("stream_traffic RPC failed");

    let mut stream = response.into_inner();

    // Broadcast first event
    service_clone
        .broadcast(TrafficEvent {
            pid: 1234,
            process_name: "firefox".to_string(),
            destination_ip: "1.1.1.1".to_string(),
            destination_port: 443,
            protocol: "TCP".to_string(),
            bytes_sent: 512,
            bytes_received: 1024,
            action: "ALLOW".to_string(),
        })
        .expect("failed to broadcast event 1");

    // Verify first event
    let first_msg = tokio::time::timeout(Duration::from_secs(5), stream.next())
        .await
        .expect("Stream timed out waiting for 1st message")
        .expect("Stream ended prematurely")
        .expect("Error in gRPC stream");

    assert_eq!(first_msg.pid, 1234);
    assert_eq!(first_msg.process_name, "firefox");
    assert_eq!(first_msg.destination_ip, "1.1.1.1");
    assert_eq!(first_msg.destination_port, 443);
    assert_eq!(first_msg.protocol, "TCP");
    assert_eq!(first_msg.action, "ALLOW");
    assert_eq!(first_msg.bytes_sent, 512);
    assert_eq!(first_msg.bytes_received, 1024);

    // Broadcast second event
    service_clone
        .broadcast(TrafficEvent {
            pid: 1234,
            process_name: "firefox".to_string(),
            destination_ip: "1.1.1.1".to_string(),
            destination_port: 443,
            protocol: "TCP".to_string(),
            bytes_sent: 1024,
            bytes_received: 2048,
            action: "ALLOW".to_string(),
        })
        .expect("failed to broadcast event 2");

    // Verify second event
    let second_msg = tokio::time::timeout(Duration::from_secs(5), stream.next())
        .await
        .expect("Stream timed out waiting for 2nd message")
        .expect("Stream ended prematurely")
        .expect("Error in gRPC stream");

    assert_eq!(second_msg.bytes_sent, 1024);
    assert_eq!(second_msg.bytes_received, 2048);

    // Clean shutdown
    drop(stream);
    let _ = shutdown_tx.send(());
    let _ = tokio::time::timeout(Duration::from_secs(2), server_handle).await;
}
