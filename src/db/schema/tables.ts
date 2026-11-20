import * as t from "drizzle-orm/pg-core";

export const users = t.pgTable("users", {
  id: t.bigint({ mode: "number" }).notNull().primaryKey(),
  name: t.text().notNull(),
});

export const groups = t.pgTable("groups", {
  id: t.bigint({ mode: "number" }).notNull().primaryKey(),
  name: t.text(),
  resetAt: t.timestamp({ withTimezone: true, mode: "date" }),
  cooldown: t.integer(),
});

export const clownVotes = t.pgTable(
  "clown_votes",
  {
    id: t.bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    voterId: t.bigint({ mode: "number" }).references(() => users.id),
    clownId: t
      .bigint({ mode: "number" })
      .notNull()
      .references(() => users.id),
    groupId: t
      .bigint({ mode: "number" })
      .notNull()
      .references(() => groups.id),
    votedAt: t.timestamp({ withTimezone: true, mode: "date" }).notNull().defaultNow(),
    quantity: t.bigint({ mode: "number" }).notNull().default(1),
  },
  (table) => [
    t.index("clown_votes_group_voter_idx").on(table.groupId, table.voterId, table.votedAt),
    t.index("clown_votes_group_idx").on(table.groupId),
  ],
);

/** Gifs/stickers that count as a clown/unclown call in a group. `key` is `mediaKey(file_id)`. */
export const groupTriggers = t.pgTable(
  "group_triggers",
  {
    groupId: t
      .bigint({ mode: "number" })
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    key: t.text().notNull(),
    /** Last seen file_id, for re-sending the media in `/triggers`. Null for rows migrated from the old jsonb columns. */
    fileId: t.text(),
    media: t.text({ enum: ["animation", "sticker"] }).notNull(),
    action: t.text({ enum: ["clown", "unclown"] }).notNull(),
  },
  (table) => [t.primaryKey({ columns: [table.groupId, table.key] })],
);
