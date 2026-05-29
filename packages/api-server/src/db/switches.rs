use rusqlite::params;
use tracing::error;

use super::{get_conn, query_rows, DbPool, DbResult};
use crate::error::AppError;
use crate::schema::{DeviceSwitchState, SwitchLogEntry};

pub fn get_switch_state(pool: &DbPool, device_id: &str) -> DbResult<Option<DeviceSwitchState>> {
    let conn = get_conn(pool)?;
    let result = conn.query_row(
        "SELECT device_id, device_name, power, updated_at FROM device_switch_states WHERE device_id = ?1",
        params![device_id],
        |row| {
            Ok(DeviceSwitchState {
                device_id: row.get(0)?,
                device_name: row.get(1)?,
                power: row.get(2)?,
                updated_at: row.get(3)?,
            })
        },
    );

    match result {
        Ok(state) => Ok(Some(state)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(AppError::Database(format!("Failed to query switch state: {e}"))),
    }
}

pub fn upsert_switch_state(
    pool: &DbPool,
    device_id: &str,
    device_name: &str,
    power: &str,
) -> DbResult<()> {
    let conn = get_conn(pool)?;
    conn.execute(
        "INSERT INTO device_switch_states (device_id, device_name, power) VALUES (?1, ?2, ?3) \
         ON CONFLICT(device_id) DO UPDATE SET power = ?3, updated_at = datetime('now')",
        params![device_id, device_name, power],
    )
    .map_err(|e| {
        error!("Failed to upsert switch state for {device_id}: {e}");
        AppError::Database(format!("Failed to upsert switch state: {e}"))
    })?;
    Ok(())
}

pub fn get_all_switch_states(pool: &DbPool) -> DbResult<Vec<DeviceSwitchState>> {
    let conn = get_conn(pool)?;
    query_rows!(
        conn,
        "SELECT device_id, device_name, power, updated_at FROM device_switch_states",
        [],
        |row| {
            Ok(DeviceSwitchState {
                device_id: row.get(0)?,
                device_name: row.get(1)?,
                power: row.get(2)?,
                updated_at: row.get(3)?,
            })
        }
    )
}

pub fn insert_switch_log(
    pool: &DbPool,
    device_id: &str,
    device_name: &str,
    action: &str,
    trigger_reason: Option<&str>,
) -> DbResult<()> {
    let conn = get_conn(pool)?;
    conn.execute(
        "INSERT INTO switch_log (device_id, device_name, action, trigger_reason) VALUES (?1, ?2, ?3, ?4)",
        params![device_id, device_name, action, trigger_reason],
    )
    .map_err(|e| {
        error!("Failed to insert switch log: {e}");
        AppError::Database(format!("Failed to insert switch log: {e}"))
    })?;
    Ok(())
}

pub fn get_switch_log(pool: &DbPool, limit: i64) -> DbResult<Vec<SwitchLogEntry>> {
    let conn = get_conn(pool)?;
    query_rows!(
        conn,
        "SELECT id, timestamp, device_id, device_name, action, trigger_reason \
         FROM switch_log ORDER BY timestamp DESC LIMIT ?1",
        params![limit],
        |row| {
            Ok(SwitchLogEntry {
                id: row.get(0)?,
                timestamp: row.get(1)?,
                device_id: row.get(2)?,
                device_name: row.get(3)?,
                action: row.get(4)?,
                trigger_reason: row.get(5)?,
            })
        }
    )
}
