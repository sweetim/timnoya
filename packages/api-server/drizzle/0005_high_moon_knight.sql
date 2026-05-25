CREATE TABLE `switch_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`timestamp` text DEFAULT (datetime('now')) NOT NULL,
	`device_id` text NOT NULL,
	`device_name` text NOT NULL,
	`action` text NOT NULL,
	`trigger_reason` text
);
