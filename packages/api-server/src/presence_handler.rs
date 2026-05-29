use crate::database::{get_switch_state, insert_switch_log, upsert_switch_state, DbPool};
use crate::switchbot::SwitchBotClient;
use tracing::{error, info, warn};

const KITCHEN_LIGHT_DEVICE_NAME: &str = "Kitchen Light";
const LIGHT_LEVEL_THRESHOLD: i64 = 5;

pub fn init_switch_states(pool: &DbPool, kitchen_light_device_id: &str) {
    if kitchen_light_device_id.is_empty() {
        warn!("KITCHEN_LIGHT_DEVICE_ID not set, presence automation disabled");
        return;
    }

    match get_switch_state(pool, kitchen_light_device_id) {
        Some(existing) => {
            info!(
                "Switch state for {} ({}): {}",
                KITCHEN_LIGHT_DEVICE_NAME, kitchen_light_device_id, existing.power
            );
        }
        None => {
            upsert_switch_state(
                pool,
                kitchen_light_device_id,
                KITCHEN_LIGHT_DEVICE_NAME,
                "off",
            );
            info!(
                "Initialized switch state for {} ({}) as off",
                KITCHEN_LIGHT_DEVICE_NAME, kitchen_light_device_id
            );
        }
    }
}

pub async fn handle_presence_event(
    pool: DbPool,
    client: SwitchBotClient,
    kitchen_light_device_id: &str,
    detection_state: Option<&str>,
    light_level: Option<i64>,
    _device_mac: Option<&str>,
) {
    if kitchen_light_device_id.is_empty() {
        return;
    }

    let detection_state = match detection_state {
        Some(s) => s,
        None => return,
    };

    let device_id_owned = kitchen_light_device_id.to_string();
    let current_state = tokio::task::spawn_blocking({
        let pool = pool.clone();
        move || get_switch_state(&pool, &device_id_owned)
    })
    .await
    .unwrap_or(None);

    let current_power = current_state
        .as_ref()
        .map(|s| s.power.as_str())
        .unwrap_or("off");

    if detection_state == "DETECTED" {
        let light_level = match light_level {
            Some(l) => l,
            None => {
                info!("DETECTED but no lightLevel, skipping");
                return;
            }
        };

        if light_level > LIGHT_LEVEL_THRESHOLD {
            info!(
                "DETECTED but lightLevel={light_level} > {LIGHT_LEVEL_THRESHOLD}, skipping"
            );
            return;
        }

        if current_power == "on" {
            info!("DETECTED but kitchen light already on, skipping");
            return;
        }

        info!(
            "DETECTED with lightLevel={light_level} <= {LIGHT_LEVEL_THRESHOLD}, turning on kitchen light"
        );

        match client
            .send_device_command(kitchen_light_device_id, "turnOn", None)
            .await
        {
            Ok(_) => {
                let pool = pool.clone();
                let device_id = kitchen_light_device_id.to_string();
                let reason = format!("motion detected, lightLevel={light_level}");
                tokio::task::spawn_blocking(move || {
                    upsert_switch_state(
                        &pool,
                        &device_id,
                        KITCHEN_LIGHT_DEVICE_NAME,
                        "on",
                    );
                    insert_switch_log(
                        &pool,
                        &device_id,
                        KITCHEN_LIGHT_DEVICE_NAME,
                        "on",
                        Some(&reason),
                    );
                })
                .await
                .ok();
                info!("Kitchen light turned on, state updated");
            }
            Err(e) => error!("Failed to turn on kitchen light: {e}"),
        }
    } else if detection_state == "NOT_DETECTED" {
        if current_power == "off" {
            info!("NOT_DETECTED but kitchen light already off, skipping");
            return;
        }

        info!("NOT_DETECTED, turning off kitchen light");

        match client
            .send_device_command(kitchen_light_device_id, "turnOff", None)
            .await
        {
            Ok(_) => {
                let pool = pool.clone();
                let device_id = kitchen_light_device_id.to_string();
                tokio::task::spawn_blocking(move || {
                    upsert_switch_state(
                        &pool,
                        &device_id,
                        KITCHEN_LIGHT_DEVICE_NAME,
                        "off",
                    );
                    insert_switch_log(
                        &pool,
                        &device_id,
                        KITCHEN_LIGHT_DEVICE_NAME,
                        "off",
                        Some("motion not detected"),
                    );
                })
                .await
                .ok();
                info!("Kitchen light turned off, state updated");
            }
            Err(e) => error!("Failed to turn off kitchen light: {e}"),
        }
    }
}
