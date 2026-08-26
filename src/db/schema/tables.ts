import * as t from "drizzle-orm/pg-core";

export const users = t.pgTable("users", {
  id: t.bigint({ mode: "number" }).notNull().primaryKey(),
  name: t.text().notNull(),
});

export const groups = t.pgTable("groups", {
  id: t.bigint({ mode: "number" }).notNull().primaryKey(),
  name: t.text(),
  gifIds: t.jsonb().$type<string[]>(),
  stickerIds: t.jsonb().$type<string[]>(),
  resetAt: t.timestamp({ withTimezone: true, mode: "date" }),
  cooldown: t.integer(),
});

export const clownVotes = t.pgTable(
  "clown_votes",
  {
    id: t.integer().primaryKey().generatedAlwaysAsIdentity(),
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
  },
  (table) => [
    t.index("clown_votes_group_voter_idx").on(table.groupId, table.voterId, table.votedAt),
    t.index("clown_votes_group_idx").on(table.groupId),
  ],
);
