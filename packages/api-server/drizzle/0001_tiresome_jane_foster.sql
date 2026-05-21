PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_brightness_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`timestamp` text DEFAULT (datetime('now')) NOT NULL,
	`device_id` text NOT NULL,
	`device_name` text NOT NULL,
	`brightness` text,
	`battery` integer
);
--> statement-breakpoint
INSERT INTO `__new_brightness_logs`("id", "timestamp", "device_id", "device_name", "brightness", "battery") SELECT "id", "timestamp", "device_id", "device_name", "brightness", "battery" FROM `brightness_logs`;--> statement-breakpoint
DROP TABLE `brightness_logs`;--> statement-breakpoint
ALTER TABLE `__new_brightness_logs` RENAME TO `brightness_logs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;