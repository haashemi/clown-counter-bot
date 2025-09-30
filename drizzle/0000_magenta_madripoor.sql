CREATE TABLE `clown_votes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`voter_id` integer NOT NULL,
	`clown_id` integer NOT NULL,
	`voted_at` text NOT NULL,
	FOREIGN KEY (`voter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`clown_id`) REFERENCES `clowns`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `clown_votes_voterId_unique` ON `clown_votes` (`voter_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `clown_votes_clownId_unique` ON `clown_votes` (`clown_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_unique_clown_vote` ON `clown_votes` (`clown_id`,`voter_id`);--> statement-breakpoint
CREATE TABLE `clowns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tg_id` integer NOT NULL,
	`name` text NOT NULL,
	`group_id` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `clowns_tgId_unique` ON `clowns` (`tg_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `clowns_groupId_unique` ON `clowns` (`group_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_unique_clown_in_group` ON `clowns` (`tg_id`,`group_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY NOT NULL,
	`tg_id` integer NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_tgId_unique` ON `users` (`tg_id`);