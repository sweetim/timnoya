mod database;
mod light_sensor;
mod logger;
mod presence_handler;
mod schema;
mod switchbot;
mod webhook;

use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::Deserialize;
use tower_http::services::ServeDir;

use database::DbPool;
use switchbot::SwitchBotClient;

#[derive(Clone)]
struct AppState {
    db: DbPool,
    switchbot: SwitchBotClient,
    kitchen_light_device_id: String,
}

#[derive(Deserialize)]
struct PaginationQuery {
    limit: Option<i64>,
}

#[derive(Deserialize)]
struct BrightnessQuery {
    limit: Option<i64>,
    aggregation: Option<String>,
}

#[derive(Deserialize)]
struct TemperatureQuery {
    aggregation: Option<String>,
}

#[derive(serde::Serialize)]
struct DevicesResponse {
    devices: Vec<switchbot::Device>,
}

#[derive(serde::Serialize)]
struct StatusesResponse {
    statuses: Vec<switchbot::DeviceStatus>,
}

#[derive(serde::Serialize)]
struct DeviceStatusResponse {
    status: serde_json::Value,
}

#[derive(serde::Serialize)]
struct BrightnessHistoryResponse {
    history: Vec<serde_json::Value>,
}

#[derive(serde::Serialize)]
struct TemperatureHistoryResponse {
    history: Vec<schema::TemperatureRow>,
}

#[derive(serde::Serialize)]
struct WebhookEventsResponse {
    events: Vec<schema::WebhookEvent>,
}

#[derive(serde::Serialize)]
struct SwitchesResponse {
    switches: Vec<schema::DeviceSwitchState>,
}

#[derive(serde::Serialize)]
struct SwitchLogResponse {
    log: Vec<schema::SwitchLogEntry>,
}

#[derive(serde::Serialize)]
struct WebhookAck {
    status_code: i64,
    message: String,
}

#[derive(serde::Serialize)]
struct ErrorResponse {
    error: String,
}

async fn get_devices_handler(
    State(state): State<AppState>,
) -> Result<Json<DevicesResponse>, (StatusCode, Json<ErrorResponse>)> {
    match state.switchbot.get_devices().await {
        Ok(devices) => Ok(Json(DevicesResponse { devices })),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e }),
        )),
    }
}

async fn get_all_statuses_handler(State(state): State<AppState>) -> Json<StatusesResponse> {
    let statuses = state.switchbot.get_all_device_statuses().await;
    Json(StatusesResponse { statuses })
}

async fn get_device_status_handler(
    State(state): State<AppState>,
    Path(device_id): Path<String>,
) -> Result<Json<DeviceStatusResponse>, (StatusCode, Json<ErrorResponse>)> {
    match state.switchbot.get_device_status(&device_id).await {
        Ok(status) => Ok(Json(DeviceStatusResponse { status })),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: e }),
        )),
    }
}

async fn get_brightness_handler(
    State(state): State<AppState>,
    Query(query): Query<BrightnessQuery>,
) -> Json<BrightnessHistoryResponse> {
    if let Some(ref agg) = query.aggregation {
        if matches!(agg.as_str(), "raw" | "hourly" | "daily") {
            let history = database::get_aggregated_history(&state.db, agg.as_str());
            let history: Vec<serde_json::Value> = history
                .into_iter()
                .map(|r| serde_json::to_value(r).unwrap_or_default())
                .collect();
            return Json(BrightnessHistoryResponse { history });
        }
    }

    let limit = query.limit.unwrap_or(100);
    let history = database::get_brightness_history(&state.db, limit);
    let history: Vec<serde_json::Value> = history
        .into_iter()
        .map(|r| serde_json::to_value(r).unwrap_or_default())
        .collect();
    Json(BrightnessHistoryResponse { history })
}

async fn get_temperature_handler(
    State(state): State<AppState>,
    Query(query): Query<TemperatureQuery>,
) -> Json<TemperatureHistoryResponse> {
    let mode = query.aggregation.as_deref().unwrap_or("hourly");
    let mode = mode.to_string();
    let history = database::get_temperature_history(&state.db, &mode);
    Json(TemperatureHistoryResponse { history })
}

async fn post_webhook_handler(
    State(state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Json<WebhookAck> {
    let event_type = payload
        .get("eventType")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown");
    let event_version = payload
        .get("eventVersion")
        .and_then(|v| v.as_str());
    let context = payload.get("context");

    let device_type = context.and_then(|c| c.get("deviceType")).and_then(|v| v.as_str());
    let device_mac = context.and_then(|c| c.get("deviceMac")).and_then(|v| v.as_str());

    database::insert_webhook_event(
        &state.db,
        event_type,
        event_version,
        device_type,
        device_mac,
        &payload.to_string(),
    );

    tracing::info!(
        "Received event: {} device={}",
        event_type,
        device_mac.unwrap_or("unknown")
    );

    if event_type == "changeReport" {
        if let Some(ctx) = context {
            let temperature = ctx
                .get("temperature")
                .and_then(|v| v.as_i64());
            let humidity = ctx.get("humidity").and_then(|v| v.as_i64());

            if temperature.is_some() || humidity.is_some() {
                let mac = device_mac.unwrap_or("unknown");
                database::insert_sensor_reading(
                    &state.db,
                    mac,
                    device_type.unwrap_or(mac),
                    temperature,
                    humidity,
                );
            }

            if ctx.get("detectionState").is_some() {
                let detection_state = ctx.get("detectionState").and_then(|v| v.as_str()).map(String::from);
                let light_level = ctx.get("lightLevel").and_then(|v| v.as_i64());
                let mac = ctx.get("deviceMac").and_then(|v| v.as_str()).map(String::from);

                let pool = state.db.clone();
                let client = state.switchbot.clone();
                let kitchen_id = state.kitchen_light_device_id.clone();

                tokio::spawn(async move {
                    presence_handler::handle_presence_event(
                        pool,
                        client,
                        &kitchen_id,
                        detection_state.as_deref(),
                        light_level,
                        mac.as_deref(),
                    ).await;
                });
            }
        }
    }

    Json(WebhookAck {
        status_code: 100,
        message: "success".to_string(),
    })
}

async fn get_webhook_events_handler(
    State(state): State<AppState>,
    Query(query): Query<PaginationQuery>,
) -> Json<WebhookEventsResponse> {
    let limit = query.limit.unwrap_or(100);
    let events = database::get_webhook_history(&state.db, limit);
    Json(WebhookEventsResponse { events })
}

async fn get_switches_handler(State(state): State<AppState>) -> Json<SwitchesResponse> {
    let switches = database::get_all_switch_states(&state.db);
    Json(SwitchesResponse { switches })
}

async fn get_switch_log_handler(
    State(state): State<AppState>,
    Query(query): Query<PaginationQuery>,
) -> Json<SwitchLogResponse> {
    let limit = query.limit.unwrap_or(100);
    let log = database::get_switch_log(&state.db, limit);
    Json(SwitchLogResponse { log })
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    logger::init();

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(3000);

    let db_path = std::env::var("DB_PATH").unwrap_or_else(|_| "/data/brightness.db".to_string());
    let pool = database::init_db(&db_path);

    let token = std::env::var("SWITCHBOT_TOKEN").expect("SWITCHBOT_TOKEN required");
    let secret = std::env::var("SWITCHBOT_SECRET_KEY").expect("SWITCHBOT_SECRET_KEY required");
    let kitchen_light_device_id =
        std::env::var("KITCHEN_LIGHT_DEVICE_ID").unwrap_or_default();

    let switchbot_client = SwitchBotClient::new(token, secret);

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
        .route("/devices", get(get_devices_handler))
        .route("/devices/status", get(get_all_statuses_handler))
        .route("/devices/{deviceId}/status", get(get_device_status_handler))
        .route("/sensors/brightness", get(get_brightness_handler))
        .route("/sensors/temperature", get(get_temperature_handler))
        .route("/webhook/switchbot", post(post_webhook_handler))
        .route("/webhook/events", get(get_webhook_events_handler))
        .route("/switches", get(get_switches_handler))
        .route("/switches/log", get(get_switch_log_handler))
        .with_state(state);

    let static_dir = std::env::var("STATIC_DIR").unwrap_or_else(|_| "/app/dist".to_string());
    let static_exists = std::path::Path::new(&static_dir).exists();

    let app = Router::new()
        .nest("/api", api_routes)
        .fallback_service(ServeDir::new(&static_dir).append_index_html_on_directories(static_exists))
        .layer(tower_http::trace::TraceLayer::new_for_http());

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port))
        .await
        .expect("Failed to bind");
    tracing::info!("API server running at http://localhost:{}", port);
    axum::serve(listener, app).await.expect("Server error");
}
