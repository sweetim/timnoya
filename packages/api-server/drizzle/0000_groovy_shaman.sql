CREATE TABLE IF NOT EXISTS `brightness_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`timestamp` text DEFAULT (datetime('now')) NOT NULL,
	`device_id` text NOT NULL,
	`device_name` text NOT NULL,
	`brightness` text NOT NULL,
	`battery` integer
);
