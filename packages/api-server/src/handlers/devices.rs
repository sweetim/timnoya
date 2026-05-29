use axum::extract::{Path, State};
use axum::Json;
use serde::Serialize;

use crate::error::AppError;
use crate::state::AppState;
use crate::switchbot::{Device, DeviceStatus};

#[derive(Serialize)]
pub struct DevicesResponse {
    pub devices: Vec<Device>,
}

#[derive(Serialize)]
pub struct StatusesResponse {
    pub statuses: Vec<DeviceStatus>,
}

#[derive(Serialize)]
pub struct DeviceStatusResponse {
    pub status: serde_json::Value,
}

pub async fn get_devices(
    State(state): State<AppState>,
) -> Result<Json<DevicesResponse>, AppError> {
    let devices = state
        .switchbot
        .get_devices()
        .await
        .map_err(AppError::SwitchBot)?;
    Ok(Json(DevicesResponse { devices }))
}

pub async fn get_all_statuses(
    State(state): State<AppState>,
) -> Result<Json<StatusesResponse>, AppError> {
    let statuses = state
        .switchbot
        .get_all_device_statuses()
        .await
        .map_err(AppError::SwitchBot)?;
    Ok(Json(StatusesResponse { statuses }))
}

pub async fn get_device_status(
    State(state): State<AppState>,
    Path(device_id): Path<String>,
) -> Result<Json<DeviceStatusResponse>, AppError> {
    let status = state
        .switchbot
        .get_device_status(&device_id)
        .await
        .map_err(AppError::SwitchBot)?;
    Ok(Json(DeviceStatusResponse { status }))
}
