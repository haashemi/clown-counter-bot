ALTER TABLE `groups` RENAME COLUMN "tg_id" TO "id";--> statement-breakpoint
ALTER TABLE `users` RENAME COLUMN "tg_id" TO "id";--> statement-breakpoint
ALTER TABLE `groups` ADD `gif_id` text;--> statement-breakpoint
ALTER TABLE `groups` ADD `sticker_id` text;--> statement-breakpoint
ALTER TABLE `groups` ADD `reset_at` integer;--> statement-breakpoint
ALTER TABLE `groups` ADD `cooldown` integer;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_clown_votes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`voter_id` integer,
	`clown_id` integer NOT NULL,
	`group_id` integer NOT NULL,
	`voted_at` text NOT NULL,
	FOREIGN KEY (`voter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`clown_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_clown_votes`("id", "voter_id", "clown_id", "group_id", "voted_at") SELECT "id", "voter_id", "clown_id", "group_id", "voted_at" FROM `clown_votes`;--> statement-breakpoint
DROP TABLE `clown_votes`;--> statement-breakpoint
ALTER TABLE `__new_clown_votes` RENAME TO `clown_votes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;