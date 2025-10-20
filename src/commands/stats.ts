import { Command } from "@grammyjs/commands";
import { count, desc, eq } from "drizzle-orm";

import type { BotContext } from "@/lib/bot";

import { clownVotesTable, db, usersTable } from "@/db";

async function privateStatsHandler(ctx: BotContext) {
  return await ctx.reply("بزودی...");
}

async function groupStatsHandler(ctx: BotContext) {
  const message = ctx.message;
  if (!message) return;

  const clowns = await db
    .select({
      name: usersTable.name,
      count: count(clownVotesTable.id),
    })
    .from(clownVotesTable)
    .leftJoin(usersTable, eq(usersTable.tgId, clownVotesTable.clownId))
    .groupBy(usersTable.tgId)
    .where(eq(clownVotesTable.groupId, message.chat.id))
    .orderBy(desc(count(clownVotesTable.id)));

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

export const cmdStats = new Command<BotContext>("stats", "📊 آمار دلقک‌شماری")
  .addToScope({ type: "all_private_chats" }, privateStatsHandler)
  .addToScope({ type: "all_group_chats" }, groupStatsHandler);
