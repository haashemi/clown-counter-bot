import * as t from "drizzle-orm/sqlite-core";

export const users = t.sqliteTable("users", {
  id: t.int().notNull().primaryKey(),
  name: t.text().notNull(),
});

export const groups = t.sqliteTable("groups", {
  id: t.int().notNull().primaryKey(),
  name: t.text(),
  gifIds: t.text(),
  stickerIds: t.text(),
  resetAt: t.int({ mode: "timestamp" }),
  cooldown: t.int(),
});

export const clownVotes = t.sqliteTable("clown_votes", {
  id: t.int().primaryKey({ autoIncrement: true }),
  voterId: t.int().references(() => users.id),
  clownId: t
    .int()
    .notNull()
    .references(() => users.id),
  groupId: t
    .int()
    .notNull()
    .references(() => groups.id),
  votedAt: t
    .text()
    .notNull()
    .$default(() => new Date().toISOString()),
});
