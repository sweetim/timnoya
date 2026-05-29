use axum::extract::{Query, State};
use axum::Json;
use serde::{Deserialize, Serialize};

use crate::error::AppError;
use crate::schema::AggregatedRow;
use crate::state::AppState;

#[derive(Deserialize)]
pub struct BrightnessQuery {
    pub aggregation: Option<String>,
}

#[derive(Deserialize)]
pub struct TemperatureQuery {
    pub aggregation: Option<String>,
}

#[derive(Serialize)]
pub struct BrightnessHistoryResponse {
    pub history: Vec<AggregatedRow>,
}

#[derive(Serialize)]
pub struct TemperatureHistoryResponse {
    pub history: Vec<crate::schema::TemperatureRow>,
}

pub async fn get_brightness(
    State(state): State<AppState>,
    Query(query): Query<BrightnessQuery>,
) -> Result<Json<BrightnessHistoryResponse>, AppError> {
    let mode = query.aggregation.as_deref().unwrap_or("raw").to_string();
    let pool = state.db.clone();
    let history = tokio::task::spawn_blocking(move || {
        crate::db::sensors::get_aggregated_history(&pool, &mode)
    })
    .await
    .map_err(|e| AppError::Database(format!("spawn_blocking failed: {e}")))??;
    Ok(Json(BrightnessHistoryResponse { history }))
}

pub async fn get_temperature(
    State(state): State<AppState>,
    Query(query): Query<TemperatureQuery>,
) -> Result<Json<TemperatureHistoryResponse>, AppError> {
    let mode = query
        .aggregation
        .as_deref()
        .unwrap_or("hourly")
        .to_string();
    let pool = state.db.clone();
    let history = tokio::task::spawn_blocking(move || {
        crate::db::sensors::get_temperature_history(&pool, &mode)
    })
    .await
    .map_err(|e| AppError::Database(format!("spawn_blocking failed: {e}")))??;
    Ok(Json(TemperatureHistoryResponse { history }))
}
