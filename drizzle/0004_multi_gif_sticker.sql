ALTER TABLE `groups` RENAME COLUMN "gif_id" TO "gif_ids";--> statement-breakpoint
ALTER TABLE `groups` RENAME COLUMN "sticker_id" TO "sticker_ids";--> statement-breakpoint
UPDATE `groups` SET `gif_ids` = '[' || json_quote(`gif_ids`) || ']' WHERE `gif_ids` IS NOT NULL AND `gif_ids` NOT LIKE '[%';--> statement-breakpoint
UPDATE `groups` SET `sticker_ids` = '[' || json_quote(`sticker_ids`) || ']' WHERE `sticker_ids` IS NOT NULL AND `sticker_ids` NOT LIKE '[%';
