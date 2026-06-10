CREATE TABLE `plugin_permissions` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`plugin_key` varchar(255) NOT NULL,
	`permission_key` varchar(255) NOT NULL,
	`description` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `plugin_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `plugin_permission_unique_idx` UNIQUE(`plugin_key`,`permission_key`)
);
--> statement-breakpoint
CREATE INDEX `plugin_permissions_plugin_key_idx` ON `plugin_permissions` (`plugin_key`);
--> statement-breakpoint
CREATE TABLE `plugin_events` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`plugin_key` varchar(255) NOT NULL,
	`event_name` varchar(255) NOT NULL,
	`direction` varchar(20) NOT NULL,
	`description` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `plugin_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `plugin_event_unique_idx` UNIQUE(`plugin_key`,`event_name`,`direction`)
);
--> statement-breakpoint
CREATE INDEX `plugin_events_event_name_idx` ON `plugin_events` (`event_name`);
--> statement-breakpoint
CREATE TABLE `plugin_migrations` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`plugin_key` varchar(255) NOT NULL,
	`migration` varchar(255) NOT NULL,
	`checksum` varchar(64) NOT NULL,
	`applied_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `plugin_migrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `plugin_migration_unique_idx` UNIQUE(`plugin_key`,`migration`)
);
--> statement-breakpoint
CREATE INDEX `plugin_migrations_plugin_key_idx` ON `plugin_migrations` (`plugin_key`);
