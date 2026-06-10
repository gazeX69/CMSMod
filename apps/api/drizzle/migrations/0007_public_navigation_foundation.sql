CREATE TABLE `navigation_items` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`label` varchar(255) NOT NULL,
	`url` varchar(255) NOT NULL,
	`target` varchar(50) NOT NULL DEFAULT '_self',
	`parent_id` bigint,
	`sort_order` int NOT NULL DEFAULT 0,
	`location` varchar(100) NOT NULL DEFAULT 'primary',
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `navigation_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `navigation_items_location_idx` ON `navigation_items` (`location`);
--> statement-breakpoint
CREATE INDEX `navigation_items_parent_id_idx` ON `navigation_items` (`parent_id`);
--> statement-breakpoint
CREATE INDEX `navigation_items_sort_order_idx` ON `navigation_items` (`sort_order`);
--> statement-breakpoint
ALTER TABLE `navigation_items` ADD CONSTRAINT `navigation_items_parent_id_navigation_items_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `navigation_items`(`id`) ON DELETE no action ON UPDATE no action;
