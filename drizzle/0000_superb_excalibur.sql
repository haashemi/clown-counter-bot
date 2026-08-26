CREATE TABLE "clown_votes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "clown_votes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"voter_id" bigint,
	"clown_id" bigint NOT NULL,
	"group_id" bigint NOT NULL,
	"voted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" bigint PRIMARY KEY NOT NULL,
	"name" text,
	"gif_ids" jsonb,
	"sticker_ids" jsonb,
	"reset_at" timestamp with time zone,
	"cooldown" integer
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigint PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clown_votes" ADD CONSTRAINT "clown_votes_voter_id_users_id_fk" FOREIGN KEY ("voter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clown_votes" ADD CONSTRAINT "clown_votes_clown_id_users_id_fk" FOREIGN KEY ("clown_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clown_votes" ADD CONSTRAINT "clown_votes_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clown_votes_group_voter_idx" ON "clown_votes" USING btree ("group_id","voter_id","voted_at");--> statement-breakpoint
CREATE INDEX "clown_votes_group_idx" ON "clown_votes" USING btree ("group_id");