pub mod sensors;
pub mod switches;
pub mod webhooks;

use std::fs;
use std::path::Path;

use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::params;
use tracing::info;

use crate::error::AppError;

pub type DbPool = Pool<SqliteConnectionManager>;
pub type DbResult<T> = Result<T, AppError>;

fn get_conn(pool: &DbPool) -> Result<r2d2::PooledConnection<SqliteConnectionManager>, AppError> {
    pool.get().map_err(|e| AppError::Database(format!("Failed to get connection: {e}")))
}

macro_rules! query_rows {
    ($conn:expr, $sql:expr, $params:expr, $mapper:expr) => {{
        let mut stmt = $conn.prepare($sql).map_err(|e| {
            crate::error::AppError::Database(format!("Failed to prepare query: {e}"))
        })?;
        let rows = stmt.query_map($params, $mapper).map_err(|e| {
            crate::error::AppError::Database(format!("Failed to execute query: {e}"))
        })?;
        Ok::<Vec<_>, crate::error::AppError>(rows.filter_map(|r| r.ok()).collect())
    }};
}

pub(super) use query_rows;

pub(super) enum AggregationConfig {
    Raw { time_range: &'static str },
    Grouped { time_range: &'static str, strftime_format: &'static str },
}

pub(super) fn aggregation_params(mode: &str) -> Option<AggregationConfig> {
    match mode {
        "raw" => Some(AggregationConfig::Raw { time_range: "-24 hours" }),
        "hourly" => Some(AggregationConfig::Grouped {
            time_range: "-7 days",
            strftime_format: "%Y-%m-%d %H:00",
        }),
        "daily" => Some(AggregationConfig::Grouped {
            time_range: "-90 days",
            strftime_format: "%Y-%m-%d",
        }),
        _ => None,
    }
}

pub fn init_db(db_path: &str) -> DbPool {
    if let Some(parent) = Path::new(db_path).parent() {
        fs::create_dir_all(parent).expect("Failed to create database directory");
    }
    info!("Opening database at {db_path}");

    let manager = SqliteConnectionManager::file(db_path)
        .with_init(|conn| conn.execute_batch("PRAGMA journal_mode=WAL;"));
    let pool = Pool::new(manager).expect("Failed to create connection pool");

    let conn = pool.get().expect("Failed to get connection");
    run_migrations(&conn);
    info!("Database migrated");

    pool
}

fn run_migrations(conn: &rusqlite::Connection) {
    conn.execute_batch("CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY NOT NULL)")
        .expect("Failed to create migrations table");

    let tables_exist: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='sensor_readings'",
            [],
            |row| row.get::<_, i64>(0),
        )
        .unwrap_or(0)
        > 0;

    if tables_exist {
        conn.execute(
            "INSERT OR IGNORE INTO _migrations (name) VALUES ('0000_init')",
            [],
        )
        .unwrap();
    }

    let migrations: Vec<(&str, &str)> = vec![
        ("0000_init", include_str!("../../migrations/0000_init.sql")),
        (
            "0001_brightness_real_and_indices",
            include_str!("../../migrations/0001_brightness_real_and_indices.sql"),
        ),
        (
            "0002_add_power_watts",
            include_str!("../../migrations/0002_add_power_watts.sql"),
        ),
    ];

    for (name, sql) in migrations {
        let applied: bool = conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM _migrations WHERE name = ?1",
                params![name],
                |row| row.get(0),
            )
            .unwrap_or(false);

        if !applied {
            info!("Applying migration: {name}");
            conn.execute_batch(sql)
                .unwrap_or_else(|e| panic!("Migration {name} failed: {e}"));
            conn.execute(
                "INSERT INTO _migrations (name) VALUES (?1)",
                params![name],
            )
            .unwrap();
        }
    }
}
