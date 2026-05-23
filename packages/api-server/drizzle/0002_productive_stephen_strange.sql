CREATE TABLE `webhook_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`timestamp` text DEFAULT (datetime('now')) NOT NULL,
	`event_type` text NOT NULL,
	`event_version` text,
	`device_type` text,
	`device_mac` text,
	`payload` text NOT NULL
);
