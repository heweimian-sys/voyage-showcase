CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`source_key` text NOT NULL,
	`url` text NOT NULL,
	`wechat` text NOT NULL,
	`group_name` text NOT NULL,
	`title` text NOT NULL,
	`intro` text NOT NULL,
	`type` text NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`cover_image` text DEFAULT '' NOT NULL,
	`raw` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `submissions_source_key_unique` ON `submissions` (`source_key`);