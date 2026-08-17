CREATE TABLE `covers` (
	`id` text PRIMARY KEY NOT NULL,
	`data` blob NOT NULL,
	`content_type` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
