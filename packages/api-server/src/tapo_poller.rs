use std::time::Duration;

use tapo::ApiClient;
use tokio::time;
use tracing::{error, info};

use crate::db::sensors;
use crate::db::DbPool;

const POWER_INTERVAL_SECS: u64 = 5 * 60;

pub fn start_tapo_power_polling(pool: DbPool, username: String, password: String, ip: String) {
    tokio::spawn(async move {
        info!("Starting Tapo P110 power polling for {ip}");

        let mut interval = time::interval(Duration::from_secs(POWER_INTERVAL_SECS));
        loop {
            interval.tick().await;
            if let Err(e) = log_power(&pool, &username, &password, &ip).await {
                error!("Power polling failed: {e}");
            }
        }
    });
}

async fn log_power(
    pool: &DbPool,
    username: &str,
    password: &str,
    ip: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let device = ApiClient::new(username, password).p110(ip).await?;

    let power = device.get_current_power().await?;
    let watts = power.current_power as f64;

    sensors::insert_power_reading(pool, "tapo-p110", "P110 Power Monitor", watts)?;
    info!("Logged power reading: {watts} W");

    Ok(())
}
