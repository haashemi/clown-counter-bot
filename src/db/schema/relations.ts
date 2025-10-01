import { relations } from "drizzle-orm";

import { clownVotesTable, groupsTable, usersTable } from "./schema";

export const usersRelations = relations(usersTable, ({ many }) => ({
  voted: many(clownVotesTable),
  clowned: many(clownVotesTable),
}));

export const clownVotesRelations = relations(clownVotesTable, ({ one }) => ({
  group: one(groupsTable, { fields: [clownVotesTable.groupId], references: [groupsTable.tgId] }),
  voter: one(usersTable, { fields: [clownVotesTable.voterId], references: [usersTable.tgId] }),
  clown: one(usersTable, { fields: [clownVotesTable.clownId], references: [usersTable.tgId] }),
}));
