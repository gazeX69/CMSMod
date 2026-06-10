CREATE TABLE `permissions` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`key` varchar(255) NOT NULL,
	`description` text,
	`source` varchar(50) NOT NULL DEFAULT 'core',
	`plugin_key` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `permissions_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE INDEX `permissions_source_idx` ON `permissions` (`source`);
--> statement-breakpoint
CREATE INDEX `permissions_plugin_key_idx` ON `permissions` (`plugin_key`);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`role_id` bigint NOT NULL,
	`permission_id` bigint NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `role_permissions_role_id_permission_id_pk` PRIMARY KEY(`role_id`,`permission_id`)
);
--> statement-breakpoint
CREATE INDEX `role_permissions_permission_id_idx` ON `role_permissions` (`permission_id`);
--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permission_id_permissions_id_fk` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE cascade ON UPDATE no action;
