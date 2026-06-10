ALTER TABLE `media_files` ADD `uuid` varchar(36);
--> statement-breakpoint
ALTER TABLE `media_files` ADD CONSTRAINT `media_files_uuid_unique` UNIQUE(`uuid`);