use std::time::Duration;

use tokio::time;
use tracing::{error, info, warn};

use crate::db::sensors;
use crate::db::DbPool;
use crate::switchbot::{Device, SwitchBotClient};

const BRIGHTNESS_INTERVAL_SECS: u64 = 10 * 60;
const BATTERY_INTERVAL_SECS: u64 = 24 * 60 * 60;

async fn find_light_battery_devices(client: &SwitchBotClient) -> Vec<Device> {
    let devices = match client.get_devices().await {
        Ok(d) => d,
        Err(e) => {
            error!("Failed to get devices for discovery: {e}");
            return vec![];
        }
    };

    let physical: Vec<_> = devices
        .into_iter()
        .filter(|d| d.kind != "infrared")
        .collect();

    let results: Vec<Option<Device>> =
        futures::future::join_all(physical.into_iter().map(|device| {
            let client = client.clone();
            async move {
                match client.get_device_status(&device.device_id).await {
                    Ok(status) => {
                        let has_light = status.get("lightLevel").is_some();
                        let has_battery = status.get("battery").is_some();
                        if has_light || has_battery {
                            Some(device)
                        } else {
                            None
                        }
                    }
                    Err(e) => {
                        warn!(
                            "Failed to get status for {} during discovery: {e}",
                            device.device_name
                        );
                        None
                    }
                }
            }
        }))
        .await;

    results.into_iter().flatten().collect()
}

async fn update_batteries(pool: &DbPool, client: &SwitchBotClient, devices: &[Device]) {
    let updates: Vec<(Device, Option<i64>)> =
        futures::future::join_all(devices.iter().map(|device| {
            let client = client.clone();
            let device = device.clone();
            async move {
                match client.get_device_status(&device.device_id).await {
                    Ok(status) => {
                        let battery = status.get("battery").and_then(|v| v.as_i64());
                        (device, battery)
                    }
                    Err(e) => {
                        error!("Failed to update battery for {}: {e}", device.device_name);
                        (device, None)
                    }
                }
            }
        }))
        .await;

    for (device, battery) in updates {
        if let Some(battery) = battery {
            if let Err(e) = sensors::insert_reading(pool, &device.device_id, &device.device_name, None, Some(battery)) {
                error!("Failed to store battery for {}: {e}", device.device_name);
            }
            info!("Updated battery for {}: {battery}", device.device_name);
        }
    }
}

async fn log_readings(pool: &DbPool, client: &SwitchBotClient, devices: &[Device]) {
    let readings: Vec<(Device, Option<f64>)> =
        futures::future::join_all(devices.iter().map(|device| {
            let client = client.clone();
            let device = device.clone();
            async move {
                match client.get_device_status(&device.device_id).await {
                    Ok(status) => {
                        let brightness = status
                            .get("lightLevel")
                            .and_then(|v| v.as_i64())
                            .map(|l| l as f64);
                        (device, brightness)
                    }
                    Err(e) => {
                        error!("Failed to log reading for {}: {e}", device.device_name);
                        (device, None)
                    }
                }
            }
        }))
        .await;

    for (device, brightness) in readings {
        if let Err(e) = sensors::insert_reading(
            pool,
            &device.device_id,
            &device.device_name,
            brightness,
            None,
        ) {
            error!("Failed to store reading for {}: {e}", device.device_name);
        }
        info!(
            "Logged reading for {}: brightness={:?}",
            device.device_name, brightness
        );
    }
}

pub fn start_light_sensor_polling(pool: DbPool, client: SwitchBotClient) {
    tokio::spawn(async move {
        let devices = find_light_battery_devices(&client).await;

        info!(
            "Found {} device(s) with lightLevel|battery: {}",
            devices.len(),
            devices
                .iter()
                .map(|d| d.device_name.as_str())
                .collect::<Vec<_>>()
                .join(", ")
        );

        {
            let pool = pool.clone();
            let devices = devices.clone();
            let client = client.clone();
            tokio::spawn(async move {
                log_readings(&pool, &client, &devices).await;
            });
        }

        {
            let pool = pool.clone();
            let devices = devices.clone();
            let client = client.clone();
            tokio::spawn(async move {
                update_batteries(&pool, &client, &devices).await;
            });
        }

        {
            let pool = pool.clone();
            let devices = devices.clone();
            let client = client.clone();
            tokio::spawn(async move {
                let mut interval =
                    time::interval(Duration::from_secs(BRIGHTNESS_INTERVAL_SECS));
                loop {
                    interval.tick().await;
                    log_readings(&pool, &client, &devices).await;
                }
            });
        }

        {
            let pool = pool.clone();
            let devices = devices.clone();
            let client = client.clone();
            tokio::spawn(async move {
                let mut interval =
                    time::interval(Duration::from_secs(BATTERY_INTERVAL_SECS));
                loop {
                    interval.tick().await;
                    update_batteries(&pool, &client, &devices).await;
                }
            });
        }
    });
}
