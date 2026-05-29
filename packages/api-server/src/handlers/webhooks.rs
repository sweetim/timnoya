use axum::extract::{Query, State};
use axum::Json;
use serde::Serialize;

use super::PaginationQuery;
use crate::database;
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
    let event_version = payload
        .get("eventVersion")
        .and_then(|v| v.as_str())
        .map(String::from);
    let context = payload.get("context").cloned();

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

    let payload_str = payload.to_string();
    {
        let pool = state.db.clone();
        let event_type = event_type.clone();
        let event_version = event_version.clone();
        let device_type = device_type.clone();
        let device_mac = device_mac.clone();
        tokio::task::spawn_blocking(move || {
            database::insert_webhook_event(
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

    tracing::info!(
        "Received event: {} device={}",
        event_type,
        device_mac.as_deref().unwrap_or("unknown")
    );

    if event_type == "changeReport" {
        if let Some(ctx) = context {
            let temperature = ctx.get("temperature").and_then(|v| v.as_i64());
            let humidity = ctx.get("humidity").and_then(|v| v.as_i64());

            if temperature.is_some() || humidity.is_some() {
                let mac = device_mac.as_deref().unwrap_or("unknown").to_string();
                let device_type = device_type.as_deref().unwrap_or(&mac).to_string();
                let pool = state.db.clone();
                tokio::task::spawn_blocking(move || {
                    database::insert_sensor_reading(
                        &pool,
                        &mac,
                        &device_type,
                        temperature,
                        humidity,
                    );
                })
                .await
                .ok();
            }

            if ctx.get("detectionState").is_some() {
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
) -> Json<WebhookEventsResponse> {
    let limit = query.limit.unwrap_or(100);
    let pool = state.db.clone();
    let events = tokio::task::spawn_blocking(move || database::get_webhook_history(&pool, limit))
        .await
        .unwrap_or_default();
    Json(WebhookEventsResponse { events })
}
