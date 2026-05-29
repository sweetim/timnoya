use rusqlite::params;
use tracing::error;

use super::{get_conn, query_rows, DbPool, DbResult};
use crate::error::AppError;
use crate::schema::WebhookEvent;

pub fn insert_webhook_event(
    pool: &DbPool,
    event_type: &str,
    event_version: Option<&str>,
    device_type: Option<&str>,
    device_mac: Option<&str>,
    payload: &str,
) -> DbResult<()> {
    let conn = get_conn(pool)?;
    conn.execute(
        "INSERT INTO webhook_events (event_type, event_version, device_type, device_mac, payload) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![event_type, event_version, device_type, device_mac, payload],
    )
    .map_err(|e| {
        error!("Failed to insert webhook event ({event_type}): {e}");
        AppError::Database(format!("Failed to insert webhook event: {e}"))
    })?;
    Ok(())
}

pub fn get_webhook_history(pool: &DbPool, limit: i64) -> DbResult<Vec<WebhookEvent>> {
    let conn = get_conn(pool)?;
    query_rows!(
        conn,
        "SELECT id, timestamp, event_type, event_version, device_type, device_mac, payload \
         FROM webhook_events ORDER BY timestamp DESC LIMIT ?1",
        params![limit],
        |row| {
            Ok(WebhookEvent {
                id: row.get(0)?,
                timestamp: row.get(1)?,
                event_type: row.get(2)?,
                event_version: row.get(3)?,
                device_type: row.get(4)?,
                device_mac: row.get(5)?,
                payload: row.get(6)?,
            })
        }
    )
}
