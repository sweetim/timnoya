use axum::extract::{Query, State};
use axum::Json;
use serde::Serialize;

use super::PaginationQuery;
use crate::state::AppState;

#[derive(Serialize)]
pub struct SwitchesResponse {
    pub switches: Vec<crate::schema::DeviceSwitchState>,
}

#[derive(Serialize)]
pub struct SwitchLogResponse {
    pub log: Vec<crate::schema::SwitchLogEntry>,
}

pub async fn get_switches(State(state): State<AppState>) -> Json<SwitchesResponse> {
    let pool = state.db.clone();
    let switches = tokio::task::spawn_blocking(move || {
        crate::database::get_all_switch_states(&pool)
    })
    .await
    .unwrap_or_default();
    Json(SwitchesResponse { switches })
}

pub async fn get_switch_log(
    State(state): State<AppState>,
    Query(query): Query<PaginationQuery>,
) -> Json<SwitchLogResponse> {
    let limit = query.limit.unwrap_or(100);
    let pool = state.db.clone();
    let log = tokio::task::spawn_blocking(move || crate::database::get_switch_log(&pool, limit))
        .await
        .unwrap_or_default();
    Json(SwitchLogResponse { log })
}
