ALTER TABLE `media_files` MODIFY COLUMN `uploaded_by` bigint;--> statement-breakpoint
ALTER TABLE `media_files` ADD `extension` varchar(50);--> statement-breakpoint
ALTER TABLE `media_files` ADD `public_url` varchar(255);--> statement-breakpoint
ALTER TABLE `media_files` ADD `disk` varchar(50) DEFAULT 'local' NOT NULL;--> statement-breakpoint
ALTER TABLE `media_files` ADD `alt_text` text;--> statement-breakpoint
ALTER TABLE `media_files` ADD `caption` text;--> statement-breakpoint
ALTER TABLE `media_files` ADD `metadata_json` text;