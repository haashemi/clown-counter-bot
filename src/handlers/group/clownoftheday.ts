import { eq } from "drizzle-orm";

import type { CommandHandler } from "@/handlers";
import type { BotContext } from "@/lib/bot";

import { db, schema } from "@/db";

const MIN_QUANTITY = 5;
const MAX_QUANTITY = 20;

async function clownOfTheDay(ctx: BotContext) {
  const { message } = ctx;
  if (!message) return;

  const groupId = message.chat.id;

  // Once per group per day: blocks if the latest system vote (voterId IS NULL)
  // falls on the same calendar day as now (server's local timezone).
  const sameDay = (d: Date, now = new Date()) =>
    d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();

  const recent = await db.query.clownVotes.findFirst({
    columns: { votedAt: true },
    where: (f, o) => o.and(o.eq(f.groupId, groupId), o.isNull(f.voterId)),
    orderBy: (f, o) => [o.desc(f.votedAt)],
  });

  if (recent && sameDay(recent.votedAt)) {
    return await ctx.reply(ctx.t("cmd_clown_of_the_day_wait"), {
      reply_parameters: { message_id: message.message_id, chat_id: groupId },
    });
  }

  // Candidates: users who ever appeared in this group's clown_votes (as voter or clown).
  const rows = await db
    .selectDistinct({ id: schema.users.id, name: schema.users.name })
    .from(schema.clownVotes)
    .innerJoin(schema.users, eq(schema.users.id, schema.clownVotes.clownId))
    .where(eq(schema.clownVotes.groupId, groupId));

  if (rows.length === 0) {
    return await ctx.reply(ctx.t("cmd_clown_of_the_day_no_users"), {
      reply_parameters: { message_id: message.message_id, chat_id: groupId },
    });
  }

  const clown = rows[Math.floor(Math.random() * rows.length)]!;
  const quantity = MIN_QUANTITY + Math.floor(Math.random() * (MAX_QUANTITY - MIN_QUANTITY + 1));

  await db.insert(schema.clownVotes).values({
    groupId,
    voterId: null,
    clownId: clown.id,
    quantity,
  });

  return await ctx.reply(ctx.t("cmd_clown_of_the_day", { clown: clown.name, quantity }), {
    reply_parameters: { message_id: message.message_id, chat_id: groupId },
  });
}

export const clownOfTheDayHandler: CommandHandler = {
  kind: "command",
  name: "clownoftheday",
  description: "👑 دلقک روز",
  scopes: [{ type: "all_group_chats" }, { type: "all_chat_administrators" }],
  handler: clownOfTheDay,
};
