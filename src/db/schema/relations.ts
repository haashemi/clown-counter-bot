import { relations } from "drizzle-orm";

import { clownVotes, groups, users } from "./tables";

export const usersRelations = relations(users, ({ many }) => ({
  voted: many(clownVotes),
  clowned: many(clownVotes),
}));

export const clownVotesRelations = relations(clownVotes, ({ one }) => ({
  group: one(groups, { fields: [clownVotes.groupId], references: [groups.id] }),
  voter: one(users, { fields: [clownVotes.voterId], references: [users.id] }),
  clown: one(users, { fields: [clownVotes.clownId], references: [users.id] }),
}));
