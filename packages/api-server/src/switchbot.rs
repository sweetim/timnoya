use std::collections::HashMap;

use hmac::{Hmac, Mac};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use tracing::{debug, error, warn};
use uuid::Uuid;

type HmacSha256 = Hmac<Sha256>;

const BASE_URL: &str = "https://api.switch-bot.com/v1.1";

#[derive(Debug, Serialize, Deserialize)]
struct SwitchBotResponse<T> {
    status_code: i64,
    message: String,
    body: Option<T>,
}

#[derive(Debug, Serialize, Deserialize)]
struct DeviceListBody {
    device_list: Vec<DeviceListEntry>,
    infrared_remote_list: Vec<InfraredRemoteListEntry>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct DeviceListEntry {
    device_id: String,
    device_type: String,
    device_name: String,
    enable_cloud_service: bool,
    hub_device_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct InfraredRemoteListEntry {
    device_id: String,
    device_name: String,
    remote_type: String,
    hub_device_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Device {
    pub device_id: String,
    pub device_type: String,
    pub device_name: String,
    pub kind: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DeviceStatus {
    pub device_id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub device_type: String,
    pub kind: String,
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone)]
pub struct SwitchBotClient {
    client: Client,
    token: String,
    secret: String,
}

impl SwitchBotClient {
    pub fn new(token: String, secret: String) -> Self {
        Self {
            client: Client::new(),
            token,
            secret,
        }
    }

    fn build_headers(&self) -> HashMap<String, String> {
        let timestamp = chrono::Utc::now().timestamp_millis();
        let nonce = Uuid::new_v4().to_string();
        let mut mac = HmacSha256::new_from_slice(self.secret.as_bytes())
            .expect("HMAC can take key of any size");
        mac.update(format!("{}{}{}", self.token, timestamp, nonce).as_bytes());
        let sign = base64_encode(mac.finalize().into_bytes().to_vec());

        let mut headers = HashMap::new();
        headers.insert("Authorization".to_string(), self.token.clone());
        headers.insert("sign".to_string(), sign);
        headers.insert("nonce".to_string(), nonce);
        headers.insert("t".to_string(), timestamp.to_string());
        headers.insert("Content-Type".to_string(), "application/json".to_string());
        headers
    }

    async fn switchbot_get<T: serde::de::DeserializeOwned>(
        &self,
        path: &str,
    ) -> Result<SwitchBotResponse<T>, String> {
        let url = format!("{}{}", BASE_URL, path);
        debug!("GET {}", path);
        let headers = self.build_headers();
        let mut req = self.client.get(&url);
        for (k, v) in headers {
            req = req.header(k, v);
        }
        let resp = req.send().await.map_err(|e| e.to_string())?;
        let data: SwitchBotResponse<T> = resp.json().await.map_err(|e| e.to_string())?;
        debug!("GET {} -> statusCode={}", path, data.status_code);
        Ok(data)
    }

    async fn switchbot_post<T: serde::de::DeserializeOwned>(
        &self,
        path: &str,
        body: &serde_json::Value,
    ) -> Result<SwitchBotResponse<T>, String> {
        let url = format!("{}{}", BASE_URL, path);
        debug!("POST {}", path);
        let headers = self.build_headers();
        let mut req = self.client.post(&url);
        for (k, v) in headers {
            req = req.header(k, v);
        }
        let resp = req.json(body).send().await.map_err(|e| e.to_string())?;
        let data: SwitchBotResponse<T> = resp.json().await.map_err(|e| e.to_string())?;
        debug!("POST {} -> statusCode={}", path, data.status_code);
        Ok(data)
    }

    pub async fn get_devices(&self) -> Result<Vec<Device>, String> {
        let data = self
            .switchbot_get::<DeviceListBody>("/devices")
            .await?;

        if data.status_code != 100 {
            let err = format!("SwitchBot API error: {} - {}", data.status_code, data.message);
            error!("{}", err);
            return Err(err);
        }

        let body = data.body.unwrap_or(DeviceListBody {
            device_list: vec![],
            infrared_remote_list: vec![],
        });

        let mut devices: Vec<Device> = body
            .device_list
            .into_iter()
            .map(|d| Device {
                device_id: d.device_id,
                device_type: d.device_type,
                device_name: d.device_name,
                kind: "physical".to_string(),
            })
            .collect();

        devices.extend(
            body.infrared_remote_list
                .into_iter()
                .map(|d| Device {
                    device_id: d.device_id,
                    device_type: d.remote_type,
                    device_name: d.device_name,
                    kind: "infrared".to_string(),
                }),
        );

        Ok(devices)
    }

    pub async fn get_device_status(
        &self,
        device_id: &str,
    ) -> Result<serde_json::Value, String> {
        let path = format!("/devices/{}/status", device_id);
        let data = self
            .switchbot_get::<serde_json::Value>(&path)
            .await?;

        if data.status_code != 100 {
            let err = format!(
                "SwitchBot API error for device {}: {} - {}",
                device_id, data.status_code, data.message
            );
            error!("{}", err);
            return Err(err);
        }

        Ok(data.body.unwrap_or(serde_json::Value::Null))
    }

    pub async fn get_all_device_statuses(&self) -> Vec<DeviceStatus> {
        let devices = match self.get_devices().await {
            Ok(d) => d,
            Err(e) => {
                error!("Failed to get devices: {}", e);
                return vec![];
            }
        };

        let mut statuses = Vec::new();

        for device in &devices {
            if device.kind == "infrared" {
                let extra = HashMap::new();
                statuses.push(DeviceStatus {
                    device_id: device.device_id.clone(),
                    name: device.device_name.clone(),
                    device_type: device.device_type.clone(),
                    kind: device.kind.clone(),
                    extra,
                });
                continue;
            }

            match self.get_device_status(&device.device_id).await {
                Ok(status) => {
                    let mut extra = HashMap::new();
                    if let serde_json::Value::Object(map) = status {
                        for (k, v) in map {
                            extra.insert(k, v);
                        }
                    }
                    statuses.push(DeviceStatus {
                        device_id: device.device_id.clone(),
                        name: device.device_name.clone(),
                        device_type: device.device_type.clone(),
                        kind: device.kind.clone(),
                        extra,
                    });
                }
                Err(e) => {
                    warn!("Failed to get status for {}: {}", device.device_name, e);
                    let mut extra = HashMap::new();
                    extra.insert("error".to_string(), serde_json::Value::Bool(true));
                    statuses.push(DeviceStatus {
                        device_id: device.device_id.clone(),
                        name: device.device_name.clone(),
                        device_type: device.device_type.clone(),
                        kind: device.kind.clone(),
                        extra,
                    });
                }
            }
        }

        statuses
    }

    pub async fn send_device_command(
        &self,
        device_id: &str,
        command: &str,
        parameter: Option<&str>,
    ) -> Result<(i64, String), String> {
        let path = format!("/devices/{}/commands", device_id);
        let body = serde_json::json!({
            "command": command,
            "parameter": parameter.unwrap_or("default"),
            "commandType": "command",
        });

        let data = self.switchbot_post::<serde_json::Value>(&path, &body).await?;

        if data.status_code != 100 {
            let err = format!(
                "SwitchBot command error for {}: {} - {}",
                device_id, data.status_code, data.message
            );
            error!("{}", err);
            return Err(err);
        }

        Ok((data.status_code, data.message))
    }

    pub async fn get_registered_webhooks(&self) -> Result<Vec<String>, String> {
        let body = serde_json::json!({ "action": "queryUrl" });
        let data = self
            .switchbot_post::<serde_json::Value>("/webhook/queryWebhook", &body)
            .await?;

        if data.status_code == 190 {
            return Ok(vec![]);
        }

        if data.status_code != 100 {
            let err = format!(
                "SwitchBot queryWebhook error: {} - {}",
                data.status_code, data.message
            );
            error!("{}", err);
            return Err(err);
        }

        let urls = data
            .body
            .and_then(|b| b.get("urls").cloned())
            .and_then(|u| serde_json::from_value::<Vec<String>>(u).ok())
            .unwrap_or_default();

        Ok(urls)
    }

    pub async fn setup_webhook(
        &self,
        url: &str,
    ) -> Result<(i64, String), String> {
        let body = serde_json::json!({
            "action": "setupWebhook",
            "url": url,
            "deviceList": "ALL",
        });

        let data = self
            .switchbot_post::<serde_json::Value>("/webhook/setupWebhook", &body)
            .await?;

        if data.status_code != 100 {
            let err = format!(
                "SwitchBot setupWebhook error: {} - {}",
                data.status_code, data.message
            );
            error!("{}", err);
            return Err(err);
        }

        Ok((data.status_code, data.message))
    }
}

fn base64_encode(data: Vec<u8>) -> String {
    use base64::engine::general_purpose::STANDARD;
    use base64::Engine;
    STANDARD.encode(data)
}
