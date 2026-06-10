CREATE TABLE `plugins` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`key` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`version` varchar(50) NOT NULL,
	`type` varchar(50) NOT NULL DEFAULT 'first-party-plugin',
	`status` varchar(50) NOT NULL DEFAULT 'inactive',
	`description` text,
	`manifest_json` text,
	`installed_at` datetime NOT NULL,
	`activated_at` datetime,
	`deactivated_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `plugins_id` PRIMARY KEY(`id`),
	CONSTRAINT `plugins_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
ALTER TABLE `media_files` ADD `deleted_at` datetime;