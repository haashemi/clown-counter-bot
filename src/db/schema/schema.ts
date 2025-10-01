import * as t from "drizzle-orm/sqlite-core";

export const usersTable = t.sqliteTable("users", {
  tgId: t.int().notNull().primaryKey(),
  name: t.text().notNull(),
});

export const groupsTable = t.sqliteTable("groups", {
  tgId: t.int().notNull().primaryKey(),
  name: t.text(),
});

export const clownVotesTable = t.sqliteTable("clown_votes", {
  id: t.int().primaryKey({ autoIncrement: true }),
  groupId: t
    .int()
    .notNull()
    .references(() => groupsTable.tgId),
  voterId: t
    .int()
    .notNull()
    .references(() => usersTable.tgId),
  clownId: t
    .int()
    .notNull()
    .references(() => usersTable.tgId),
  votedAt: t
    .text()
    .notNull()
    .$default(() => new Date().toISOString()),
});
