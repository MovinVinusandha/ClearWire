use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::Emitter;
use tokio::time::{sleep, Duration};

#[allow(clippy::result_large_err)]
pub mod clearwire {
    tonic::include_proto!("clearwire.v1");
}

use clearwire::daemon_service_client::DaemonServiceClient;
use clearwire::Empty;

#[derive(Clone, serde::Serialize)]
pub struct DaemonStatus {
    pub connected: bool,
    pub endpoint: String,
    pub error: Option<String>,
}

#[derive(Clone, Default)]
pub struct DaemonState {
    pub connected: Arc<AtomicBool>,
}

#[tauri::command]
fn check_daemon_connected(state: tauri::State<DaemonState>) -> bool {
    state.connected.load(Ordering::Relaxed)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let daemon_state = DaemonState::default();
    let connected_flag = daemon_state.connected.clone();

    tauri::Builder::default()
        .manage(daemon_state)
        .invoke_handler(tauri::generate_handler![check_daemon_connected])
        .setup(move |app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let app_handle = app.handle().clone();
            let is_connected = connected_flag.clone();
            tauri::async_runtime::spawn(async move {
                let grpc_endpoint = "http://[::1]:50051";
                log::info!("Starting ClearWire daemon gRPC connection manager...");

                loop {
                    log::info!("Connecting to daemon at {grpc_endpoint}...");
                    is_connected.store(false, Ordering::Relaxed);
                    let _ = app_handle.emit(
                        "daemon-status",
                        DaemonStatus {
                            connected: false,
                            endpoint: grpc_endpoint.to_string(),
                            error: None,
                        },
                    );

                    match DaemonServiceClient::connect(grpc_endpoint).await {
                        Ok(mut client) => {
                            log::info!("Connected to ClearWire Core Daemon successfully");
                            is_connected.store(true, Ordering::Relaxed);
                            let _ = app_handle.emit(
                                "daemon-status",
                                DaemonStatus {
                                    connected: true,
                                    endpoint: grpc_endpoint.to_string(),
                                    error: None,
                                },
                            );

                            match client.stream_traffic(Empty {}).await {
                                Ok(response) => {
                                    let mut stream = response.into_inner();
                                    log::info!("gRPC stream established. Receiving events...");

                                    while let Ok(Some(event)) = stream.message().await {
                                        is_connected.store(true, Ordering::Relaxed);
                                        if let Err(err) = app_handle.emit("traffic-event", &event) {
                                            log::error!(
                                                "Failed to emit traffic-event to webview: {err}"
                                            );
                                        }
                                    }
                                    log::warn!("gRPC traffic stream closed by daemon.");
                                }
                                Err(err) => {
                                    log::error!("Failed to open stream_traffic: {err}");
                                    is_connected.store(false, Ordering::Relaxed);
                                    let _ = app_handle.emit(
                                        "daemon-status",
                                        DaemonStatus {
                                            connected: false,
                                            endpoint: grpc_endpoint.to_string(),
                                            error: Some(err.to_string()),
                                        },
                                    );
                                }
                            }
                        }
                        Err(err) => {
                            log::warn!("Daemon connection failed: {err}. Retrying in 2 seconds...");
                            is_connected.store(false, Ordering::Relaxed);
                            let _ = app_handle.emit(
                                "daemon-status",
                                DaemonStatus {
                                    connected: false,
                                    endpoint: grpc_endpoint.to_string(),
                                    error: Some(err.to_string()),
                                },
                            );
                        }
                    }

                    sleep(Duration::from_secs(2)).await;
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
