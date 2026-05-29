use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use tokio::time;

use crate::database::{insert_reading, DbPool};
use crate::switchbot::{Device, SwitchBotClient};
use tracing::{error, info, warn};

const BRIGHTNESS_INTERVAL_SECS: u64 = 10 * 60;
const BATTERY_INTERVAL_SECS: u64 = 24 * 60 * 60;

async fn find_light_battery_devices(
    client: &SwitchBotClient,
) -> (Vec<Device>, HashMap<String, i64>) {
    let devices = match client.get_devices().await {
        Ok(d) => d,
        Err(e) => {
            error!("Failed to get devices for discovery: {}", e);
            return (vec![], HashMap::new());
        }
    };

    let mut results = Vec::new();
    let mut battery_by_device = HashMap::new();

    for device in &devices {
        if device.kind == "infrared" {
            continue;
        }
        match client.get_device_status(&device.device_id).await {
            Ok(status) => {
                let has_light = status.get("lightLevel").is_some();
                let has_battery = status.get("battery").is_some();
                if has_light || has_battery {
                    results.push(device.clone());
                    if let Some(battery) = status.get("battery").and_then(|v| v.as_i64()) {
                        battery_by_device.insert(device.device_id.clone(), battery);
                    }
                }
            }
            Err(e) => {
                warn!(
                    "Failed to get status for {} during discovery: {}",
                    device.device_name, e
                );
            }
        }
    }

    (results, battery_by_device)
}

async fn update_batteries(
    pool: &DbPool,
    client: &SwitchBotClient,
    devices: &[Device],
    battery_by_device: &mut HashMap<String, i64>,
) {
    for device in devices {
        match client.get_device_status(&device.device_id).await {
            Ok(status) => {
                if let Some(battery) = status.get("battery").and_then(|v| v.as_i64()) {
                    battery_by_device.insert(device.device_id.clone(), battery);
                    insert_reading(
                        pool,
                        &device.device_id,
                        &device.device_name,
                        None,
                        Some(battery),
                    );
                }
                info!(
                    "Updated battery for {}: {:?}",
                    device.device_name,
                    battery_by_device.get(&device.device_id)
                );
            }
            Err(e) => error!("Failed to update battery for {}: {}", device.device_name, e),
        }
    }
}

async fn log_readings(
    pool: &DbPool,
    client: &SwitchBotClient,
    devices: &[Device],
) {
    for device in devices {
        match client.get_device_status(&device.device_id).await {
            Ok(status) => {
                let brightness = status
                    .get("lightLevel")
                    .and_then(|v| v.as_i64())
                    .map(|l| l.to_string());
                insert_reading(
                    pool,
                    &device.device_id,
                    &device.device_name,
                    brightness.as_deref(),
                    None,
                );
                info!(
                    "Logged reading for {}: brightness={:?}",
                    device.device_name, brightness
                );
            }
            Err(e) => error!("Failed to log reading for {}: {}", device.device_name, e),
        }
    }
}

pub fn start_light_sensor_polling(pool: DbPool, client: SwitchBotClient) {
    let pool = Arc::new(pool);
    let client = Arc::new(client);

    tokio::spawn(async move {
        let (devices, _battery_by_device) = find_light_battery_devices(&client).await;
        let devices = Arc::new(devices);

        info!(
            "Found {} device(s) with lightLevel|battery: {}",
            devices.len(),
            devices.iter().map(|d| d.device_name.as_str()).collect::<Vec<_>>().join(", ")
        );

        {
            let pool = pool.as_ref().clone();
            let devices = devices.clone();
            let client = client.as_ref().clone();
            tokio::spawn(async move {
                log_readings(&pool, &client, &devices).await;
            });
        }

        {
            let pool = pool.as_ref().clone();
            let devices = devices.clone();
            let client = client.as_ref().clone();
            tokio::spawn(async move {
                update_batteries(&pool, &client, &devices, &mut HashMap::new()).await;
            });
        }

        {
            let pool = Arc::clone(&pool);
            let devices = Arc::clone(&devices);
            let client = Arc::clone(&client);
            tokio::spawn(async move {
                let mut interval = time::interval(Duration::from_secs(BRIGHTNESS_INTERVAL_SECS));
                loop {
                    interval.tick().await;
                    log_readings(&pool, &client, &devices).await;
                }
            });
        }

        {
            let pool = Arc::clone(&pool);
            let devices = Arc::clone(&devices);
            let client = Arc::clone(&client);
            tokio::spawn(async move {
                let mut interval = time::interval(Duration::from_secs(BATTERY_INTERVAL_SECS));
                loop {
                    interval.tick().await;
                    update_batteries(&pool, &client, &devices, &mut HashMap::new()).await;
                }
            });
        }
    });
}
