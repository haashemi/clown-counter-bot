CREATE TABLE `clown_votes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_id` integer NOT NULL,
	`voter_id` integer NOT NULL,
	`clown_id` integer NOT NULL,
	`voted_at` text NOT NULL,
	FOREIGN KEY (`voter_id`) REFERENCES `users`(`tg_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`clown_id`) REFERENCES `users`(`tg_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_unique_clown_vote` ON `clown_votes` (`group_id`,`voter_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`tg_id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
