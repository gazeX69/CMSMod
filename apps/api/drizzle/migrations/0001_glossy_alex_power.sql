CREATE TABLE `categories` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`parent_id` bigint,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `content_categories` (
	`content_id` bigint NOT NULL,
	`category_id` bigint NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `content_categories_content_id_category_id_pk` PRIMARY KEY(`content_id`,`category_id`)
);
--> statement-breakpoint
CREATE TABLE `content_tags` (
	`content_id` bigint NOT NULL,
	`tag_id` bigint NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `content_tags_content_id_tag_id_pk` PRIMARY KEY(`content_id`,`tag_id`)
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `tags_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `contents` DROP INDEX `contents_slug_unique`;--> statement-breakpoint
ALTER TABLE `content_revisions` MODIFY COLUMN `created_by` bigint;--> statement-breakpoint
ALTER TABLE `contents` MODIFY COLUMN `type` varchar(50) NOT NULL DEFAULT 'page';--> statement-breakpoint
ALTER TABLE `contents` MODIFY COLUMN `author_id` bigint;--> statement-breakpoint
ALTER TABLE `content_revisions` ADD CONSTRAINT `content_id_revision_unique_idx` UNIQUE(`content_id`,`revision_number`);--> statement-breakpoint
ALTER TABLE `contents` ADD CONSTRAINT `type_slug_unique_idx` UNIQUE(`type`,`slug`);--> statement-breakpoint
ALTER TABLE `content_revisions` ADD `excerpt` text;--> statement-breakpoint
ALTER TABLE `content_revisions` ADD `status` varchar(50);--> statement-breakpoint
ALTER TABLE `content_revisions` ADD `snapshot_json` text;--> statement-breakpoint
ALTER TABLE `categories` ADD CONSTRAINT `categories_parent_id_categories_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `content_categories` ADD CONSTRAINT `content_categories_content_id_contents_id_fk` FOREIGN KEY (`content_id`) REFERENCES `contents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `content_categories` ADD CONSTRAINT `content_categories_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `content_tags` ADD CONSTRAINT `content_tags_content_id_contents_id_fk` FOREIGN KEY (`content_id`) REFERENCES `contents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `content_tags` ADD CONSTRAINT `content_tags_tag_id_tags_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `categories_parent_id_idx` ON `categories` (`parent_id`);--> statement-breakpoint
CREATE INDEX `categories_sort_order_idx` ON `categories` (`sort_order`);--> statement-breakpoint
CREATE INDEX `categories_slug_idx` ON `categories` (`slug`);--> statement-breakpoint
CREATE INDEX `content_categories_category_id_idx` ON `content_categories` (`category_id`);--> statement-breakpoint
CREATE INDEX `content_tags_tag_id_idx` ON `content_tags` (`tag_id`);--> statement-breakpoint
CREATE INDEX `tags_slug_idx` ON `tags` (`slug`);--> statement-breakpoint
CREATE INDEX `revisions_content_id_idx` ON `content_revisions` (`content_id`);--> statement-breakpoint
CREATE INDEX `contents_type_idx` ON `contents` (`type`);--> statement-breakpoint
CREATE INDEX `contents_status_idx` ON `contents` (`status`);--> statement-breakpoint
CREATE INDEX `contents_published_at_idx` ON `contents` (`published_at`);--> statement-breakpoint
CREATE INDEX `contents_author_id_idx` ON `contents` (`author_id`);--> statement-breakpoint
CREATE INDEX `contents_deleted_at_idx` ON `contents` (`deleted_at`);