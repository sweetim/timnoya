use axum::extract::{Query, State};
use axum::Json;
use serde::Serialize;

use super::PaginationQuery;
use crate::db;
use crate::error::AppError;
use crate::presence_handler;
use crate::state::AppState;

#[derive(Serialize)]
pub struct WebhookAck {
    pub status_code: i64,
    pub message: String,
}

#[derive(Serialize)]
pub struct WebhookEventsResponse {
    pub events: Vec<crate::schema::WebhookEvent>,
}

pub async fn post_webhook(
    State(state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Json<WebhookAck> {
    let event_type = payload
        .get("eventType")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown")
        .to_string();

    let context = payload.get("context").cloned();
    let event_version = payload
        .get("eventVersion")
        .and_then(|v| v.as_str())
        .map(String::from);
    let device_type = context
        .as_ref()
        .and_then(|c| c.get("deviceType"))
        .and_then(|v| v.as_str())
        .map(String::from);
    let device_mac = context
        .as_ref()
        .and_then(|c| c.get("deviceMac"))
        .and_then(|v| v.as_str())
        .map(String::from);

    persist_webhook_event(
        &state.db,
        &event_type,
        event_version.as_deref(),
        device_type.as_deref(),
        device_mac.as_deref(),
        &payload,
    )
    .await;

    tracing::info!(
        "Received event: {} device={}",
        event_type,
        device_mac.as_deref().unwrap_or("unknown")
    );

    if event_type == "changeReport" {
        if let Some(ref ctx) = context {
            handle_change_report(&state, ctx, device_mac.as_deref()).await;
        }
    }

    Json(WebhookAck {
        status_code: 100,
        message: "success".to_string(),
    })
}

pub async fn get_webhook_events(
    State(state): State<AppState>,
    Query(query): Query<PaginationQuery>,
) -> Result<Json<WebhookEventsResponse>, AppError> {
    let limit = query.limit.unwrap_or(100);
    let pool = state.db.clone();
    let events = tokio::task::spawn_blocking(move || db::webhooks::get_webhook_history(&pool, limit))
        .await
        .map_err(|e| AppError::Database(format!("spawn_blocking failed: {e}")))??;
    Ok(Json(WebhookEventsResponse { events }))
}

async fn persist_webhook_event(
    pool: &crate::db::DbPool,
    event_type: &str,
    event_version: Option<&str>,
    device_type: Option<&str>,
    device_mac: Option<&str>,
    payload: &serde_json::Value,
) {
    let pool = pool.clone();
    let event_type = event_type.to_string();
    let event_version = event_version.map(String::from);
    let device_type = device_type.map(String::from);
    let device_mac = device_mac.map(String::from);
    let payload_str = payload.to_string();

    tokio::task::spawn_blocking(move || {
        let _ = db::webhooks::insert_webhook_event(
            &pool,
            &event_type,
            event_version.as_deref(),
            device_type.as_deref(),
            device_mac.as_deref(),
            &payload_str,
        );
    })
    .await
    .ok();
}

async fn handle_change_report(
    state: &AppState,
    ctx: &serde_json::Value,
    device_mac: Option<&str>,
) {
    handle_temperature_humidity(state, ctx, device_mac).await;
    handle_presence(state, ctx, device_mac).await;
}

async fn handle_temperature_humidity(
    state: &AppState,
    ctx: &serde_json::Value,
    device_mac: Option<&str>,
) {
    let temperature = ctx.get("temperature").and_then(|v| v.as_i64());
    let humidity = ctx.get("humidity").and_then(|v| v.as_i64());

    if temperature.is_none() && humidity.is_none() {
        return;
    }

    let mac = device_mac.unwrap_or("unknown").to_string();
    let device_type = ctx
        .get("deviceType")
        .and_then(|v| v.as_str())
        .unwrap_or(&mac)
        .to_string();
    let pool = state.db.clone();

    tokio::task::spawn_blocking(move || {
        let _ = db::sensors::insert_sensor_reading(&pool, &mac, &device_type, temperature, humidity);
    })
    .await
    .ok();
}

async fn handle_presence(
    state: &AppState,
    ctx: &serde_json::Value,
    _device_mac: Option<&str>,
) {
    if ctx.get("detectionState").is_none() {
        return;
    }

    let detection_state = ctx
        .get("detectionState")
        .and_then(|v| v.as_str())
        .map(String::from);
    let light_level = ctx.get("lightLevel").and_then(|v| v.as_i64());
    let mac = ctx
        .get("deviceMac")
        .and_then(|v| v.as_str())
        .map(String::from);

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
        )
        .await;
    });
}
