use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use hmac::{Hmac, Mac};
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use tokio::sync::Semaphore;
use tracing::{debug, error, warn};
use uuid::Uuid;

use crate::error::SwitchBotError;

type HmacSha256 = Hmac<Sha256>;

const BASE_URL: &str = "https://api.switch-bot.com/v1.1";
const MAX_CONCURRENT_STATUS_FETCHES: usize = 5;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SwitchBotResponse<T> {
    status_code: i64,
    message: String,
    body: Option<T>,
}

impl<T> SwitchBotResponse<T> {
    fn into_result(self, context: &str) -> Result<T, SwitchBotError> {
        if self.status_code != 100 {
            return Err(SwitchBotError::api(
                self.status_code,
                format!("{context}: {}", self.message),
            ));
        }
        Ok(self.body.unwrap_or_else(|| {
            panic!("SwitchBot API returned status 100 but no body for {context}")
        }))
    }
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
    semaphore: Arc<Semaphore>,
}

impl SwitchBotClient {
    pub fn new(token: String, secret: String) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client");
        Self {
            client,
            token,
            secret,
            semaphore: Arc::new(Semaphore::new(MAX_CONCURRENT_STATUS_FETCHES)),
        }
    }

    fn build_headers(&self) -> Result<HeaderMap, SwitchBotError> {
        let timestamp = chrono::Utc::now().timestamp_millis();
        let nonce = Uuid::new_v4().to_string();
        let mut mac = HmacSha256::new_from_slice(self.secret.as_bytes())
            .expect("HMAC can take key of any size");
        mac.update(format!("{}{}{}", self.token, timestamp, nonce).as_bytes());
        let sign = STANDARD.encode(mac.finalize().into_bytes().to_vec());

        let mut headers = HeaderMap::with_capacity(5);
        headers.insert(
            AUTHORIZATION,
            HeaderValue::from_str(&self.token).map_err(|e| SwitchBotError::Http(e.to_string()))?,
        );
        headers.insert(
            "sign",
            HeaderValue::from_str(&sign).map_err(|e| SwitchBotError::Http(e.to_string()))?,
        );
        headers.insert(
            "nonce",
            HeaderValue::from_str(&nonce).map_err(|e| SwitchBotError::Http(e.to_string()))?,
        );
        headers.insert(
            "t",
            HeaderValue::from_str(&timestamp.to_string())
                .map_err(|e| SwitchBotError::Http(e.to_string()))?,
        );
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
        Ok(headers)
    }

    async fn switchbot_get<T: serde::de::DeserializeOwned>(
        &self,
        path: &str,
    ) -> Result<SwitchBotResponse<T>, SwitchBotError> {
        let url = format!("{BASE_URL}{path}");
        debug!("GET {path}");
        let headers = self.build_headers()?;
        let resp = self
            .client
            .get(&url)
            .headers(headers)
            .send()
            .await
            .map_err(|e| SwitchBotError::Http(e.to_string()))?;
        let text = resp
            .text()
            .await
            .map_err(|e| SwitchBotError::Http(e.to_string()))?;
        debug!("GET {path} response body: {text}");
        let data: SwitchBotResponse<T> = serde_json::from_str(&text).map_err(|e| {
            error!("Failed to decode GET {path} response: {e} | body: {text}");
            SwitchBotError::Decode(e.to_string())
        })?;
        debug!("GET {path} -> statusCode={}", data.status_code);
        Ok(data)
    }

    async fn switchbot_post<T: serde::de::DeserializeOwned>(
        &self,
        path: &str,
        body: &serde_json::Value,
    ) -> Result<SwitchBotResponse<T>, SwitchBotError> {
        let url = format!("{BASE_URL}{path}");
        debug!("POST {path}");
        let headers = self.build_headers()?;
        let resp = self
            .client
            .post(&url)
            .headers(headers)
            .json(body)
            .send()
            .await
            .map_err(|e| SwitchBotError::Http(e.to_string()))?;
        let text = resp
            .text()
            .await
            .map_err(|e| SwitchBotError::Http(e.to_string()))?;
        debug!("POST {path} response body: {text}");
        let data: SwitchBotResponse<T> = serde_json::from_str(&text).map_err(|e| {
            error!("Failed to decode POST {path} response: {e} | body: {text}");
            SwitchBotError::Decode(e.to_string())
        })?;
        debug!("POST {path} -> statusCode={}", data.status_code);
        Ok(data)
    }

    pub async fn get_devices(&self) -> Result<Vec<Device>, SwitchBotError> {
        let body = self
            .switchbot_get::<DeviceListBody>("/devices")
            .await?
            .into_result("get_devices")?;

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
    ) -> Result<serde_json::Value, SwitchBotError> {
        let path = format!("/devices/{device_id}/status");
        self.switchbot_get::<serde_json::Value>(&path)
            .await?
            .into_result(&format!("get_device_status({device_id})"))
    }

    pub async fn get_all_device_statuses(&self) -> Result<Vec<DeviceStatus>, SwitchBotError> {
        let devices = self.get_devices().await?;
        let semaphore = self.semaphore.clone();

        let statuses = futures::future::join_all(devices.into_iter().map(|device| {
            let client = self.clone();
            let semaphore = semaphore.clone();
            async move {
                if device.kind == "infrared" {
                    return DeviceStatus {
                        device_id: device.device_id,
                        name: device.device_name,
                        device_type: device.device_type,
                        kind: device.kind,
                        extra: HashMap::new(),
                    };
                }

                let _permit = semaphore.acquire().await.unwrap();
                match client.get_device_status(&device.device_id).await {
                    Ok(status) => {
                        let mut extra = HashMap::new();
                        if let serde_json::Value::Object(map) = status {
                            for (k, v) in map {
                                extra.insert(k, v);
                            }
                        }
                        DeviceStatus {
                            device_id: device.device_id,
                            name: device.device_name,
                            device_type: device.device_type,
                            kind: device.kind,
                            extra,
                        }
                    }
                    Err(e) => {
                        warn!("Failed to get status for {}: {e}", device.device_name);
                        DeviceStatus {
                            device_id: device.device_id,
                            name: device.device_name,
                            device_type: device.device_type,
                            kind: device.kind,
                            extra: HashMap::from([(
                                "error".to_string(),
                                serde_json::Value::Bool(true),
                            )]),
                        }
                    }
                }
            }
        }))
        .await;

        Ok(statuses)
    }

    pub async fn send_device_command(
        &self,
        device_id: &str,
        command: &str,
        parameter: Option<&str>,
    ) -> Result<(i64, String), SwitchBotError> {
        let path = format!("/devices/{device_id}/commands");
        let body = serde_json::json!({
            "command": command,
            "parameter": parameter.unwrap_or("default"),
            "commandType": "command",
        });

        let resp = self
            .switchbot_post::<serde_json::Value>(&path, &body)
            .await?;

        if resp.status_code != 100 {
            return Err(SwitchBotError::api(
                resp.status_code,
                format!("send_device_command({device_id}, {command}): {}", resp.message),
            ));
        }

        Ok((resp.status_code, resp.message))
    }

    pub async fn get_registered_webhooks(&self) -> Result<Vec<String>, SwitchBotError> {
        let body = serde_json::json!({ "action": "queryUrl" });
        let resp = self
            .switchbot_post::<serde_json::Value>("/webhook/queryWebhook", &body)
            .await?;

        if resp.status_code == 190 {
            return Ok(vec![]);
        }

        if resp.status_code != 100 {
            return Err(SwitchBotError::api(
                resp.status_code,
                format!("queryWebhook: {}", resp.message),
            ));
        }

        let urls = resp
            .body
            .and_then(|b| b.get("urls").cloned())
            .and_then(|u| serde_json::from_value::<Vec<String>>(u).ok())
            .unwrap_or_default();

        Ok(urls)
    }

    pub async fn setup_webhook(&self, url: &str) -> Result<(i64, String), SwitchBotError> {
        let body = serde_json::json!({
            "action": "setupWebhook",
            "url": url,
            "deviceList": "ALL",
        });

        let resp = self
            .switchbot_post::<serde_json::Value>("/webhook/setupWebhook", &body)
            .await?;

        if resp.status_code != 100 {
            return Err(SwitchBotError::api(
                resp.status_code,
                format!("setupWebhook({url}): {}", resp.message),
            ));
        }

        Ok((resp.status_code, resp.message))
    }
}
