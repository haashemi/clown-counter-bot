CREATE TABLE `groups` (
	`tg_id` integer PRIMARY KEY NOT NULL,
	`name` text
);
--> statement-breakpoint
INSERT INTO `groups` (`tg_id`)
SELECT `group_id` FROM `clown_votes` GROUP BY `group_id`;

--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_clown_votes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_id` integer NOT NULL,
	`voter_id` integer NOT NULL,
	`clown_id` integer NOT NULL,
	`voted_at` text NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`tg_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`voter_id`) REFERENCES `users`(`tg_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`clown_id`) REFERENCES `users`(`tg_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_clown_votes`("id", "group_id", "voter_id", "clown_id", "voted_at") SELECT "id", "group_id", "voter_id", "clown_id", "voted_at" FROM `clown_votes`;--> statement-breakpoint
DROP TABLE `clown_votes`;--> statement-breakpoint
ALTER TABLE `__new_clown_votes` RENAME TO `clown_votes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;