import * as t from "drizzle-orm/sqlite-core";

export const usersTable = t.sqliteTable("users", {
  tgId: t.int().notNull().primaryKey(),
  name: t.text().notNull(),
});

export const clownVotesTable = t.sqliteTable(
  "clown_votes",
  {
    id: t.int().primaryKey({ autoIncrement: true }),
    groupId: t.int().notNull(),
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
      .$default(() => new Date().toISOString())
      .$onUpdate(() => new Date().toISOString()),
  },
  (self) => [t.uniqueIndex("idx_unique_clown_vote").on(self.groupId, self.voterId)],
);
