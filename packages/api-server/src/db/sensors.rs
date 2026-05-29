use rusqlite::params;
use tracing::error;

use super::{get_conn, query_rows, AggregationConfig, DbPool, DbResult};
use crate::error::AppError;
use crate::schema::{AggregatedRow, TemperatureRow};

pub fn insert_reading(
    pool: &DbPool,
    device_id: &str,
    device_name: &str,
    brightness: Option<f64>,
    battery: Option<i64>,
) -> DbResult<()> {
    let conn = get_conn(pool)?;
    conn.execute(
        "INSERT INTO sensor_readings (device_id, device_name, brightness, battery) VALUES (?1, ?2, ?3, ?4)",
        params![device_id, device_name, brightness, battery],
    )
    .map_err(|e| {
        error!("Failed to insert reading for {device_name}: {e}");
        AppError::Database(format!("Failed to insert reading: {e}"))
    })?;
    Ok(())
}

pub fn insert_sensor_reading(
    pool: &DbPool,
    device_id: &str,
    device_name: &str,
    temperature: Option<i64>,
    humidity: Option<i64>,
) -> DbResult<()> {
    let conn = get_conn(pool)?;
    conn.execute(
        "INSERT INTO sensor_readings (device_id, device_name, temperature, humidity) VALUES (?1, ?2, ?3, ?4)",
        params![device_id, device_name, temperature, humidity],
    )
    .map_err(|e| {
        error!("Failed to insert sensor reading for {device_id}: {e}");
        AppError::Database(format!("Failed to insert sensor reading: {e}"))
    })?;
    Ok(())
}

pub fn get_aggregated_history(pool: &DbPool, mode: &str) -> DbResult<Vec<AggregatedRow>> {
    let config = super::aggregation_params(mode)
        .ok_or_else(|| AppError::Database(format!("Invalid aggregation mode: {mode}")))?;
    let conn = get_conn(pool)?;

    match config {
        AggregationConfig::Raw { time_range } => {
            let sql = format!(
                "SELECT id, timestamp, device_id, device_name, brightness, battery \
                 FROM sensor_readings \
                 WHERE timestamp >= datetime('now', ?1) \
                 ORDER BY timestamp DESC"
            );
            query_rows!(conn, &sql, params![time_range], |row| {
                Ok(AggregatedRow {
                    timestamp: row.get(1)?,
                    device_id: row.get(2)?,
                    device_name: row.get(3)?,
                    brightness: row.get(4)?,
                    battery: row.get::<_, Option<f64>>(5)?,
                })
            })
        }
        AggregationConfig::Grouped { time_range, strftime_format } => {
            let sql = format!(
                "SELECT strftime(?1, timestamp) as timestamp, \
                        device_id, device_name, \
                        AVG(brightness) as brightness, AVG(battery) as battery \
                 FROM sensor_readings \
                 WHERE timestamp >= datetime('now', ?2) \
                 GROUP BY strftime(?1, timestamp), device_id \
                 ORDER BY timestamp ASC"
            );
            query_rows!(conn, &sql, params![strftime_format, time_range], |row| {
                Ok(AggregatedRow {
                    timestamp: row.get(0)?,
                    device_id: row.get(1)?,
                    device_name: row.get(2)?,
                    brightness: row.get::<_, Option<f64>>(3)?.map(|v| (v * 100.0).round() / 100.0),
                    battery: row.get::<_, Option<f64>>(4)?.map(|v| (v * 100.0).round() / 100.0),
                })
            })
        }
    }
}

pub fn get_temperature_history(pool: &DbPool, mode: &str) -> DbResult<Vec<TemperatureRow>> {
    let config = super::aggregation_params(mode)
        .ok_or_else(|| AppError::Database(format!("Invalid aggregation mode: {mode}")))?;
    let conn = get_conn(pool)?;

    match config {
        AggregationConfig::Raw { time_range } => {
            let sql = format!(
                "SELECT id, timestamp, device_id, device_name, temperature, humidity \
                 FROM sensor_readings \
                 WHERE timestamp >= datetime('now', ?1) \
                 AND (temperature IS NOT NULL OR humidity IS NOT NULL) \
                 ORDER BY timestamp DESC"
            );
            query_rows!(conn, &sql, params![time_range], |row| {
                Ok(TemperatureRow {
                    timestamp: row.get(1)?,
                    device_id: row.get(2)?,
                    device_name: row.get(3)?,
                    temperature: row.get::<_, Option<i64>>(4)?.map(|v| v as f64),
                    humidity: row.get::<_, Option<i64>>(5)?.map(|v| v as f64),
                })
            })
        }
        AggregationConfig::Grouped { time_range, strftime_format } => {
            let sql = format!(
                "SELECT strftime(?1, timestamp) as timestamp, \
                        device_id, device_name, \
                        AVG(temperature) as temperature, AVG(humidity) as humidity \
                 FROM sensor_readings \
                 WHERE timestamp >= datetime('now', ?2) \
                 AND (temperature IS NOT NULL OR humidity IS NOT NULL) \
                 GROUP BY strftime(?1, timestamp), device_id \
                 ORDER BY timestamp ASC"
            );
            query_rows!(conn, &sql, params![strftime_format, time_range], |row| {
                Ok(TemperatureRow {
                    timestamp: row.get(0)?,
                    device_id: row.get(1)?,
                    device_name: row.get(2)?,
                    temperature: row.get::<_, Option<f64>>(3)?.map(|v| (v * 100.0).round() / 100.0),
                    humidity: row.get::<_, Option<f64>>(4)?.map(|v| (v * 100.0).round() / 100.0),
                })
            })
        }
    }
}
