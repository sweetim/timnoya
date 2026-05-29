use std::fs;
use std::path::Path;

use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::params;
use tracing::{error, info};

use crate::schema::{
    AggregatedRow, DeviceSwitchState, SensorReading, SwitchLogEntry, TemperatureRow,
    WebhookEvent,
};

pub type DbPool = Pool<SqliteConnectionManager>;

pub fn init_db(db_path: &str) -> DbPool {
    if let Some(parent) = Path::new(db_path).parent() {
        fs::create_dir_all(parent).expect("Failed to create database directory");
    }
    info!("Opening database at {}", db_path);

    let manager = SqliteConnectionManager::file(db_path)
        .with_init(|conn| {
            conn.execute_batch("PRAGMA journal_mode=WAL;")?;
            Ok(())
        });
    let pool = Pool::new(manager).expect("Failed to create connection pool");

    let conn = pool.get().expect("Failed to get connection");
    let migration_sql = include_str!("../migrations/0000_init.sql");
    conn.execute_batch(migration_sql).expect("Failed to run migrations");
    info!("Database migrated");

    pool
}

pub fn insert_reading(
    pool: &DbPool,
    device_id: &str,
    device_name: &str,
    brightness: Option<&str>,
    battery: Option<i64>,
) {
    let conn = match pool.get() {
        Ok(c) => c,
        Err(e) => {
            error!("Failed to get connection: {}", e);
            return;
        }
    };
    if let Err(e) = conn.execute(
        "INSERT INTO sensor_readings (device_id, device_name, brightness, battery) VALUES (?1, ?2, ?3, ?4)",
        params![device_id, device_name, brightness, battery],
    ) {
        error!("Failed to insert reading for {}: {}", device_name, e);
    }
}

pub fn insert_sensor_reading(
    pool: &DbPool,
    device_id: &str,
    device_name: &str,
    temperature: Option<i64>,
    humidity: Option<i64>,
) {
    let conn = match pool.get() {
        Ok(c) => c,
        Err(e) => {
            error!("Failed to get connection: {}", e);
            return;
        }
    };
    if let Err(e) = conn.execute(
        "INSERT INTO sensor_readings (device_id, device_name, temperature, humidity) VALUES (?1, ?2, ?3, ?4)",
        params![device_id, device_name, temperature, humidity],
    ) {
        error!("Failed to insert sensor reading for {}: {}", device_id, e);
    }
}

pub fn get_brightness_history(pool: &DbPool, limit: i64) -> Vec<SensorReading> {
    let conn = match pool.get() {
        Ok(c) => c,
        Err(e) => {
            error!("Failed to get connection: {}", e);
            return vec![];
        }
    };
    let mut stmt = match conn.prepare(
        "SELECT id, timestamp, device_id, device_name, brightness, temperature, humidity, battery FROM sensor_readings ORDER BY timestamp DESC LIMIT ?1",
    ) {
        Ok(s) => s,
        Err(e) => {
            error!("Failed to prepare query: {}", e);
            return vec![];
        }
    };
    let rows = stmt.query_map(params![limit], |row| {
        Ok(SensorReading {
            id: row.get(0)?,
            timestamp: row.get(1)?,
            device_id: row.get(2)?,
            device_name: row.get(3)?,
            brightness: row.get(4)?,
            temperature: row.get(5)?,
            humidity: row.get(6)?,
            battery: row.get(7)?,
        })
    });
    match rows {
        Ok(r) => r.filter_map(|r| r.ok()).collect(),
        Err(e) => {
            error!("Failed to query brightness history: {}", e);
            vec![]
        }
    }
}

pub fn get_aggregated_history(pool: &DbPool, mode: &str) -> Vec<AggregatedRow> {
    let (time_range, strftime_format) = match mode {
        "raw" => ("-24 hours", "%Y-%m-%d %H:%M"),
        "hourly" => ("-7 days", "%Y-%m-%d %H:00"),
        "daily" => ("-90 days", "%Y-%m-%d"),
        _ => return vec![],
    };

    let conn = match pool.get() {
        Ok(c) => c,
        Err(e) => {
            error!("Failed to get connection: {}", e);
            return vec![];
        }
    };

    if mode == "raw" {
        let sql = format!(
            "SELECT id, timestamp, device_id, device_name, brightness, temperature, humidity, battery FROM sensor_readings WHERE timestamp >= datetime('now', '{}') ORDER BY timestamp DESC",
            time_range
        );
        let mut stmt = match conn.prepare(&sql) {
            Ok(s) => s,
            Err(e) => {
                error!("Failed to prepare query: {}", e);
                return vec![];
            }
        };
        let rows = stmt.query_map([], |row| {
            let brightness_str: Option<String> = row.get(4)?;
            Ok(AggregatedRow {
                timestamp: row.get(1)?,
                device_id: row.get(2)?,
                device_name: row.get(3)?,
                brightness: brightness_str
                    .as_deref()
                    .and_then(|s| s.parse::<f64>().ok()),
                battery: row.get(7)?,
            })
        });
        match rows {
            Ok(r) => r.filter_map(|r| r.ok()).collect(),
            Err(e) => {
                error!("Failed to query aggregated history: {}", e);
                vec![]
            }
        }
    } else {
        let sql = format!(
            "SELECT strftime('{}', timestamp) as timestamp, device_id, device_name, AVG(CAST(brightness AS REAL)) as brightness, AVG(battery) as battery FROM sensor_readings WHERE timestamp >= datetime('now', '{}') GROUP BY strftime('{}', timestamp), device_id ORDER BY timestamp ASC",
            strftime_format, time_range, strftime_format
        );
        let mut stmt = match conn.prepare(&sql) {
            Ok(s) => s,
            Err(e) => {
                error!("Failed to prepare query: {}", e);
                return vec![];
            }
        };
        let rows = stmt.query_map([], |row| {
            Ok(AggregatedRow {
                timestamp: row.get(0)?,
                device_id: row.get(1)?,
                device_name: row.get(2)?,
                brightness: row.get::<_, Option<f64>>(3)?.map(|v| (v * 100.0).round() / 100.0),
                battery: row.get::<_, Option<f64>>(4)?.map(|v| (v * 100.0).round() / 100.0),
            })
        });
        match rows {
            Ok(r) => r.filter_map(|r| r.ok()).collect(),
            Err(e) => {
                error!("Failed to query aggregated history: {}", e);
                vec![]
            }
        }
    }
}

pub fn get_temperature_history(pool: &DbPool, mode: &str) -> Vec<TemperatureRow> {
    let (time_range, strftime_format) = match mode {
        "raw" => ("-24 hours", "%Y-%m-%d %H:%M"),
        "hourly" => ("-7 days", "%Y-%m-%d %H:00"),
        "daily" => ("-90 days", "%Y-%m-%d"),
        _ => return vec![],
    };

    let conn = match pool.get() {
        Ok(c) => c,
        Err(e) => {
            error!("Failed to get connection: {}", e);
            return vec![];
        }
    };

    if mode == "raw" {
        let sql = format!(
            "SELECT id, timestamp, device_id, device_name, temperature, humidity FROM sensor_readings WHERE timestamp >= datetime('now', '{}') AND (temperature IS NOT NULL OR humidity IS NOT NULL) ORDER BY timestamp DESC",
            time_range
        );
        let mut stmt = match conn.prepare(&sql) {
            Ok(s) => s,
            Err(e) => {
                error!("Failed to prepare query: {}", e);
                return vec![];
            }
        };
        let rows = stmt.query_map([], |row| {
            Ok(TemperatureRow {
                timestamp: row.get(1)?,
                device_id: row.get(2)?,
                device_name: row.get(3)?,
                temperature: row.get::<_, Option<i64>>(4)?.map(|v| v as f64),
                humidity: row.get::<_, Option<i64>>(5)?.map(|v| v as f64),
            })
        });
        match rows {
            Ok(r) => r.filter_map(|r| r.ok()).collect(),
            Err(e) => {
                error!("Failed to query temperature history: {}", e);
                vec![]
            }
        }
    } else {
        let sql = format!(
            "SELECT strftime('{}', timestamp) as timestamp, device_id, device_name, AVG(temperature) as temperature, AVG(humidity) as humidity FROM sensor_readings WHERE timestamp >= datetime('now', '{}') AND (temperature IS NOT NULL OR humidity IS NOT NULL) GROUP BY strftime('{}', timestamp), device_id ORDER BY timestamp ASC",
            strftime_format, time_range, strftime_format
        );
        let mut stmt = match conn.prepare(&sql) {
            Ok(s) => s,
            Err(e) => {
                error!("Failed to prepare query: {}", e);
                return vec![];
            }
        };
        let rows = stmt.query_map([], |row| {
            Ok(TemperatureRow {
                timestamp: row.get(0)?,
                device_id: row.get(1)?,
                device_name: row.get(2)?,
                temperature: row.get::<_, Option<f64>>(3)?.map(|v| (v * 100.0).round() / 100.0),
                humidity: row.get::<_, Option<f64>>(4)?.map(|v| (v * 100.0).round() / 100.0),
            })
        });
        match rows {
            Ok(r) => r.filter_map(|r| r.ok()).collect(),
            Err(e) => {
                error!("Failed to query temperature history: {}", e);
                vec![]
            }
        }
    }
}

pub fn insert_webhook_event(
    pool: &DbPool,
    event_type: &str,
    event_version: Option<&str>,
    device_type: Option<&str>,
    device_mac: Option<&str>,
    payload: &str,
) {
    let conn = match pool.get() {
        Ok(c) => c,
        Err(e) => {
            error!("Failed to get connection: {}", e);
            return;
        }
    };
    if let Err(e) = conn.execute(
        "INSERT INTO webhook_events (event_type, event_version, device_type, device_mac, payload) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![event_type, event_version, device_type, device_mac, payload],
    ) {
        error!("Failed to insert webhook event ({}): {}", event_type, e);
    }
}

pub fn get_webhook_history(pool: &DbPool, limit: i64) -> Vec<WebhookEvent> {
    let conn = match pool.get() {
        Ok(c) => c,
        Err(e) => {
            error!("Failed to get connection: {}", e);
            return vec![];
        }
    };
    let mut stmt = match conn.prepare(
        "SELECT id, timestamp, event_type, event_version, device_type, device_mac, payload FROM webhook_events ORDER BY timestamp DESC LIMIT ?1",
    ) {
        Ok(s) => s,
        Err(e) => {
            error!("Failed to prepare query: {}", e);
            return vec![];
        }
    };
    let rows = stmt.query_map(params![limit], |row| {
        Ok(WebhookEvent {
            id: row.get(0)?,
            timestamp: row.get(1)?,
            event_type: row.get(2)?,
            event_version: row.get(3)?,
            device_type: row.get(4)?,
            device_mac: row.get(5)?,
            payload: row.get(6)?,
        })
    });
    match rows {
        Ok(r) => r.filter_map(|r| r.ok()).collect(),
        Err(e) => {
            error!("Failed to query webhook history: {}", e);
            vec![]
        }
    }
}

pub fn get_switch_state(pool: &DbPool, device_id: &str) -> Option<DeviceSwitchState> {
    let conn = pool.get().ok()?;
    let mut stmt = conn.prepare(
        "SELECT device_id, device_name, power, updated_at FROM device_switch_states WHERE device_id = ?1",
    ).ok()?;
    stmt.query_row(params![device_id], |row| {
        Ok(DeviceSwitchState {
            device_id: row.get(0)?,
            device_name: row.get(1)?,
            power: row.get(2)?,
            updated_at: row.get(3)?,
        })
    }).ok()
}

pub fn upsert_switch_state(
    pool: &DbPool,
    device_id: &str,
    device_name: &str,
    power: &str,
) {
    let conn = match pool.get() {
        Ok(c) => c,
        Err(e) => {
            error!("Failed to get connection: {}", e);
            return;
        }
    };
    if let Err(e) = conn.execute(
        "INSERT INTO device_switch_states (device_id, device_name, power) VALUES (?1, ?2, ?3) ON CONFLICT(device_id) DO UPDATE SET power = ?3, updated_at = datetime('now')",
        params![device_id, device_name, power],
    ) {
        error!("Failed to upsert switch state for {}: {}", device_id, e);
    }
}

pub fn get_all_switch_states(pool: &DbPool) -> Vec<DeviceSwitchState> {
    let conn = match pool.get() {
        Ok(c) => c,
        Err(e) => {
            error!("Failed to get connection: {}", e);
            return vec![];
        }
    };
    let mut stmt = match conn.prepare(
        "SELECT device_id, device_name, power, updated_at FROM device_switch_states",
    ) {
        Ok(s) => s,
        Err(e) => {
            error!("Failed to prepare query: {}", e);
            return vec![];
        }
    };
    let rows = stmt.query_map([], |row| {
        Ok(DeviceSwitchState {
            device_id: row.get(0)?,
            device_name: row.get(1)?,
            power: row.get(2)?,
            updated_at: row.get(3)?,
        })
    });
    match rows {
        Ok(r) => r.filter_map(|r| r.ok()).collect(),
        Err(e) => {
            error!("Failed to query switch states: {}", e);
            vec![]
        }
    }
}

pub fn insert_switch_log(
    pool: &DbPool,
    device_id: &str,
    device_name: &str,
    action: &str,
    trigger_reason: Option<&str>,
) {
    let conn = match pool.get() {
        Ok(c) => c,
        Err(e) => {
            error!("Failed to get connection: {}", e);
            return;
        }
    };
    if let Err(e) = conn.execute(
        "INSERT INTO switch_log (device_id, device_name, action, trigger_reason) VALUES (?1, ?2, ?3, ?4)",
        params![device_id, device_name, action, trigger_reason],
    ) {
        error!("Failed to insert switch log: {}", e);
    }
}

pub fn get_switch_log(pool: &DbPool, limit: i64) -> Vec<SwitchLogEntry> {
    let conn = match pool.get() {
        Ok(c) => c,
        Err(e) => {
            error!("Failed to get connection: {}", e);
            return vec![];
        }
    };
    let mut stmt = match conn.prepare(
        "SELECT id, timestamp, device_id, device_name, action, trigger_reason FROM switch_log ORDER BY timestamp DESC LIMIT ?1",
    ) {
        Ok(s) => s,
        Err(e) => {
            error!("Failed to prepare query: {}", e);
            return vec![];
        }
    };
    let rows = stmt.query_map(params![limit], |row| {
        Ok(SwitchLogEntry {
            id: row.get(0)?,
            timestamp: row.get(1)?,
            device_id: row.get(2)?,
            device_name: row.get(3)?,
            action: row.get(4)?,
            trigger_reason: row.get(5)?,
        })
    });
    match rows {
        Ok(r) => r.filter_map(|r| r.ok()).collect(),
        Err(e) => {
            error!("Failed to query switch log: {}", e);
            vec![]
        }
    }
}
