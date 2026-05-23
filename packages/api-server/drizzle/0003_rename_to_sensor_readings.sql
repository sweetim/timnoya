ALTER TABLE `brightness_logs` RENAME TO `sensor_readings`;--> statement-breakpoint
ALTER TABLE `sensor_readings` ADD `temperature` integer;--> statement-breakpoint
ALTER TABLE `sensor_readings` ADD `humidity` integer;
