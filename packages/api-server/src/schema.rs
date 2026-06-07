use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct WebhookEvent {
    pub id: i64,
    pub timestamp: String,
    pub event_type: String,
    pub event_version: Option<String>,
    pub device_type: Option<String>,
    pub device_mac: Option<String>,
    pub payload: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeviceSwitchState {
    pub device_id: String,
    pub device_name: String,
    pub power: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SwitchLogEntry {
    pub id: i64,
    pub timestamp: String,
    pub device_id: String,
    pub device_name: String,
    pub action: String,
    pub trigger_reason: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AggregatedRow {
    pub timestamp: String,
    pub device_id: String,
    pub device_name: String,
    pub brightness: Option<f64>,
    pub battery: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TemperatureRow {
    pub timestamp: String,
    pub device_id: String,
    pub device_name: String,
    pub temperature: Option<f64>,
    pub humidity: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PowerRow {
    pub timestamp: String,
    pub device_id: String,
    pub device_name: String,
    pub power_watts: Option<f64>,
}
