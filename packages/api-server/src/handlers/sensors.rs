use axum::extract::{Query, State};
use axum::Json;
use serde::{Deserialize, Serialize};

use crate::state::AppState;

#[derive(Deserialize)]
pub struct BrightnessQuery {
    pub limit: Option<i64>,
    pub aggregation: Option<String>,
}

#[derive(Deserialize)]
pub struct TemperatureQuery {
    pub aggregation: Option<String>,
}

#[derive(Serialize)]
pub struct BrightnessHistoryResponse {
    pub history: Vec<serde_json::Value>,
}

#[derive(Serialize)]
pub struct TemperatureHistoryResponse {
    pub history: Vec<crate::schema::TemperatureRow>,
}

pub async fn get_brightness(
    State(state): State<AppState>,
    Query(query): Query<BrightnessQuery>,
) -> Json<BrightnessHistoryResponse> {
    if let Some(ref agg) = query.aggregation {
        if matches!(agg.as_str(), "raw" | "hourly" | "daily") {
            let pool = state.db.clone();
            let mode = agg.clone();
            let history = tokio::task::spawn_blocking(move || {
                crate::database::get_aggregated_history(&pool, &mode)
            })
            .await
            .unwrap_or_default();
            let history: Vec<serde_json::Value> = history
                .into_iter()
                .map(|r| serde_json::to_value(r).unwrap_or_default())
                .collect();
            return Json(BrightnessHistoryResponse { history });
        }
    }

    let limit = query.limit.unwrap_or(100);
    let pool = state.db.clone();
    let history = tokio::task::spawn_blocking(move || {
        crate::database::get_brightness_history(&pool, limit)
    })
    .await
    .unwrap_or_default();
    let history: Vec<serde_json::Value> = history
        .into_iter()
        .map(|r| serde_json::to_value(r).unwrap_or_default())
        .collect();
    Json(BrightnessHistoryResponse { history })
}

pub async fn get_temperature(
    State(state): State<AppState>,
    Query(query): Query<TemperatureQuery>,
) -> Json<TemperatureHistoryResponse> {
    let mode = query
        .aggregation
        .as_deref()
        .unwrap_or("hourly")
        .to_string();
    let pool = state.db.clone();
    let history = tokio::task::spawn_blocking(move || {
        crate::database::get_temperature_history(&pool, &mode)
    })
    .await
    .unwrap_or_default();
    Json(TemperatureHistoryResponse { history })
}
