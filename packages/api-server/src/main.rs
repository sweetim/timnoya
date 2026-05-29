mod db;
mod error;
mod handlers;
mod light_sensor;
mod logger;
mod presence_handler;
mod schema;
mod state;
mod switchbot;
mod webhook;

use axum::routing::{get, post};
use axum::Router;
use state::AppState;
use tower_http::services::ServeDir;

use handlers::{
    get_all_statuses, get_brightness, get_device_status, get_devices, get_switch_log,
    get_switches, get_temperature, get_webhook_events, post_webhook,
};

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    logger::init();

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(3000);

    let db_path = std::env::var("DB_PATH").unwrap_or_else(|_| "/data/brightness.db".to_string());
    let pool = db::init_db(&db_path);

    let token = std::env::var("SWITCHBOT_TOKEN").expect("SWITCHBOT_TOKEN required");
    let secret = std::env::var("SWITCHBOT_SECRET_KEY").expect("SWITCHBOT_SECRET_KEY required");
    let kitchen_light_device_id =
        std::env::var("KITCHEN_LIGHT_DEVICE_ID").unwrap_or_default();

    let switchbot_client = switchbot::SwitchBotClient::new(token, secret);

    presence_handler::init_switch_states(&pool, &kitchen_light_device_id);

    light_sensor::start_light_sensor_polling(pool.clone(), switchbot_client.clone());

    {
        let pool = pool.clone();
        let client = switchbot_client.clone();
        tokio::spawn(async move {
            webhook::ensure_webhook(pool, client).await;
        });
    }

    let state = AppState {
        db: pool,
        switchbot: switchbot_client,
        kitchen_light_device_id,
    };

    let api_routes = Router::new()
        .route("/devices", get(get_devices))
        .route("/devices/status", get(get_all_statuses))
        .route("/devices/{deviceId}/status", get(get_device_status))
        .route("/sensors/brightness", get(get_brightness))
        .route("/sensors/temperature", get(get_temperature))
        .route("/webhook/switchbot", post(post_webhook))
        .route("/webhook/events", get(get_webhook_events))
        .route("/switches", get(get_switches))
        .route("/switches/log", get(get_switch_log))
        .with_state(state);

    let static_dir = std::env::var("STATIC_DIR").unwrap_or_else(|_| "/app/dist".to_string());
    let static_exists = std::path::Path::new(&static_dir).exists();

    let app = Router::new()
        .nest("/api", api_routes)
        .fallback_service(
            ServeDir::new(&static_dir).append_index_html_on_directories(static_exists),
        )
        .layer(tower_http::trace::TraceLayer::new_for_http());

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}"))
        .await
        .expect("Failed to bind");
    tracing::info!("API server running at http://localhost:{port}");

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .expect("Server error");
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("Failed to install SIGTERM handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => tracing::info!("Received Ctrl+C, shutting down"),
        _ = terminate => tracing::info!("Received SIGTERM, shutting down"),
    }
}
