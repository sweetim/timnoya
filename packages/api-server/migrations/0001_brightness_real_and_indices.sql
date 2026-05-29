ALTER TABLE sensor_readings RENAME TO sensor_readings_old;

CREATE TABLE sensor_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    timestamp TEXT DEFAULT (datetime('now')) NOT NULL,
    device_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    brightness REAL,
    battery INTEGER,
    temperature INTEGER,
    humidity INTEGER
);

INSERT INTO sensor_readings (id, timestamp, device_id, device_name, brightness, battery, temperature, humidity)
    SELECT id, timestamp, device_id, device_name,
           CASE WHEN brightness IS NOT NULL THEN CAST(brightness AS REAL) ELSE NULL END,
           battery, temperature, humidity
    FROM sensor_readings_old;

DROP TABLE sensor_readings_old;

CREATE INDEX IF NOT EXISTS idx_sensor_readings_ts_device ON sensor_readings(timestamp, device_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_ts ON webhook_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_switch_log_ts ON switch_log(timestamp);
