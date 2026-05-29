CREATE TABLE IF NOT EXISTS sensor_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    timestamp TEXT DEFAULT (datetime('now')) NOT NULL,
    device_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    brightness TEXT,
    battery INTEGER,
    temperature INTEGER,
    humidity INTEGER
);

CREATE TABLE IF NOT EXISTS webhook_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    timestamp TEXT DEFAULT (datetime('now')) NOT NULL,
    event_type TEXT NOT NULL,
    event_version TEXT,
    device_type TEXT,
    device_mac TEXT,
    payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS device_switch_states (
    device_id TEXT PRIMARY KEY NOT NULL,
    device_name TEXT NOT NULL,
    power TEXT DEFAULT 'off' NOT NULL,
    updated_at TEXT DEFAULT (datetime('now')) NOT NULL
);

CREATE TABLE IF NOT EXISTS switch_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    timestamp TEXT DEFAULT (datetime('now')) NOT NULL,
    device_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    action TEXT NOT NULL,
    trigger_reason TEXT
);
