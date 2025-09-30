import * as t from "drizzle-orm/sqlite-core";

export const usersTable = t.sqliteTable("users", {
  id: t.int().primaryKey(),
  tgId: t.int().notNull().unique(),
  name: t.text().notNull(),
});

export const clownsTable = t.sqliteTable(
  "clowns",
  {
    id: t.int().primaryKey({ autoIncrement: true }),
    tgId: t.int().notNull().unique(),
    name: t.text().notNull(),
    groupId: t.int().notNull(),
  },
  (self) => [t.uniqueIndex("idx_unique_clown_in_group").on(self.tgId, self.groupId)],
);

export const clownVotesTable = t.sqliteTable(
  "clown_votes",
  {
    id: t.int().primaryKey({ autoIncrement: true }),
    voterId: t
      .int()
      .notNull()
      .references(() => usersTable.id),
    clownId: t
      .int()
      .notNull()
      .references(() => clownsTable.id),
    votedAt: t
      .text()
      .notNull()
      .$default(() => new Date().toISOString())
      .$onUpdate(() => new Date().toISOString()),
  },
  (self) => [t.uniqueIndex("idx_unique_clown_vote").on(self.clownId, self.voterId)],
);
