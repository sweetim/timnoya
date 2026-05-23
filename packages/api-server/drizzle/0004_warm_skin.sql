CREATE TABLE `device_switch_states` (
	`device_id` text PRIMARY KEY NOT NULL,
	`device_name` text NOT NULL,
	`power` text DEFAULT 'off' NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
