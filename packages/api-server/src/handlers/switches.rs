use axum::extract::{Query, State};
use axum::Json;
use serde::Serialize;

use super::PaginationQuery;
use crate::db;
use crate::error::AppError;
use crate::state::AppState;

#[derive(Serialize)]
pub struct SwitchesResponse {
    pub switches: Vec<crate::schema::DeviceSwitchState>,
}

#[derive(Serialize)]
pub struct SwitchLogResponse {
    pub log: Vec<crate::schema::SwitchLogEntry>,
}

pub async fn get_switches(
    State(state): State<AppState>,
) -> Result<Json<SwitchesResponse>, AppError> {
    let pool = state.db.clone();
    let switches = tokio::task::spawn_blocking(move || db::switches::get_all_switch_states(&pool))
        .await
        .map_err(|e| AppError::Database(format!("spawn_blocking failed: {e}")))??;
    Ok(Json(SwitchesResponse { switches }))
}

pub async fn get_switch_log(
    State(state): State<AppState>,
    Query(query): Query<PaginationQuery>,
) -> Result<Json<SwitchLogResponse>, AppError> {
    let limit = query.limit.unwrap_or(100);
    let pool = state.db.clone();
    let log = tokio::task::spawn_blocking(move || db::switches::get_switch_log(&pool, limit))
        .await
        .map_err(|e| AppError::Database(format!("spawn_blocking failed: {e}")))??;
    Ok(Json(SwitchLogResponse { log }))
}
