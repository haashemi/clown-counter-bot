import { Command } from "@grammyjs/commands";
import { count, desc, eq } from "drizzle-orm";

import type { BotContext } from "@/lib/bot";

import { db, schema } from "@/db";

async function groupStatsHandler(ctx: BotContext) {
  const { message } = ctx;
  if (!message) return;

  const clowns = await db
    .select({
      name: schema.users.name,
      count: count(schema.clownVotes.id),
    })
    .from(schema.clownVotes)
    .leftJoin(schema.users, eq(schema.users.id, schema.clownVotes.clownId))
    .groupBy(schema.users.id)
    .where(eq(schema.clownVotes.groupId, message.chat.id))
    .orderBy(desc(count(schema.clownVotes.id)));

  if (clowns.length === 0) {
    return await ctx.reply(ctx.t("cmd_stats_no_clown"), {
      reply_parameters: { message_id: message.message_id, chat_id: message.chat.id },
    });
  }

  const clownsText = clowns.map((c) => ctx.t("cmd_stats_group_clown", { name: c.name ?? "", votes: c.count }));

  return await ctx.reply(ctx.t("cmd_stats_group", { clowns: clownsText.join("\n") }), {
    reply_parameters: { message_id: message.message_id, chat_id: message.chat.id },
  });
}

export const cmdStats = new Command<BotContext>("stats", "📊 آمار دلقک‌شماری") //
  .addToScope({ type: "all_group_chats" }, groupStatsHandler);
