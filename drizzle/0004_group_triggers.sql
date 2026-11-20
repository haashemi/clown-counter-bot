CREATE TABLE "group_triggers" (
	"group_id" bigint NOT NULL,
	"key" text NOT NULL,
	"file_id" text,
	"media" text NOT NULL,
	"action" text NOT NULL,
	CONSTRAINT "group_triggers_group_id_key_pk" PRIMARY KEY("group_id","key")
);
--> statement-breakpoint
ALTER TABLE "group_triggers" ADD CONSTRAINT "group_triggers_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Copy the old jsonb arrays. On duplicate keys keep the first by the old match order (clown before unclown).
INSERT INTO "group_triggers" ("group_id", "key", "media", "action")
SELECT DISTINCT ON (g."id", k."key") g."id", k."key", c."media", c."action"
FROM "groups" g
CROSS JOIN LATERAL (VALUES
	(1, 'animation', 'clown', g."gif_ids"),
	(2, 'sticker', 'clown', g."sticker_ids"),
	(3, 'animation', 'unclown', g."unclown_gif_ids"),
	(4, 'sticker', 'unclown', g."unclown_sticker_ids")
) AS c("priority", "media", "action", "ids")
CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(c."ids", '[]'::jsonb)) AS k("key")
ORDER BY g."id", k."key", c."priority";--> statement-breakpoint
ALTER TABLE "groups" DROP COLUMN "gif_ids";--> statement-breakpoint
ALTER TABLE "groups" DROP COLUMN "sticker_ids";--> statement-breakpoint
ALTER TABLE "groups" DROP COLUMN "unclown_gif_ids";--> statement-breakpoint
ALTER TABLE "groups" DROP COLUMN "unclown_sticker_ids";