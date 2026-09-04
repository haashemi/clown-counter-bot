import { Command } from "@grammyjs/commands";
import { eq } from "drizzle-orm";

import type { BotContext } from "@/lib/bot";

import { db, schema } from "@/db";

const MIN_QUANTITY = 5;
const MAX_QUANTITY = 20;

async function clownOfTheDayHandler(ctx: BotContext) {
  const { message } = ctx;
  if (!message) return;

  const groupId = message.chat.id;

  // Once per group per day: any system vote (voterId IS NULL) in the last 24h blocks a rerun.
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await db.query.clownVotes.findFirst({
    columns: { votedAt: true },
    where: (f, o) => o.and(o.eq(f.groupId, groupId), o.isNull(f.voterId), o.gte(f.votedAt, dayAgo)),
  });

  if (recent) {
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

export const cmdClownOfTheDay = new Command<BotContext>("clownoftheday", "👑 دلقک روز") //
  .addToScope({ type: "all_group_chats" }, clownOfTheDayHandler)
  .addToScope({ type: "all_chat_administrators" }, clownOfTheDayHandler);
