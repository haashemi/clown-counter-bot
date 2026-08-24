import { Command } from "@grammyjs/commands";
import { and, count, desc, eq, gte } from "drizzle-orm";

import type { BotContext } from "@/lib/bot";

import { db, schema } from "@/db";

const dateFormat = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" });

async function groupStatsHandler(ctx: BotContext) {
  const { message } = ctx;
  if (!message) return;

  const group = await db.query.groups.findFirst({
    columns: { resetAt: true },
    where: (f, o) => o.eq(f.id, message.chat.id),
  });

  const conditions = [eq(schema.clownVotes.groupId, message.chat.id)];

  if (group?.resetAt) {
    conditions.push(gte(schema.clownVotes.votedAt, new Date(group.resetAt).toISOString()));
  }

  const clowns = await db
    .select({
      name: schema.users.name,
      count: count(schema.clownVotes.id),
    })
    .from(schema.clownVotes)
    .leftJoin(schema.users, eq(schema.users.id, schema.clownVotes.clownId))
    .groupBy(schema.users.id)
    .where(and(...conditions))
    .orderBy(desc(count(schema.clownVotes.id)));

  if (clowns.length === 0) {
    return await ctx.reply(ctx.t("cmd_stats_no_clown"), {
      reply_parameters: { message_id: message.message_id, chat_id: message.chat.id },
    });
  }

  const clownsText = clowns.map((c) => ctx.t("cmd_stats_group_clown", { name: c.name ?? "", votes: c.count }));

  const resetText = group?.resetAt
    ? `\n\n${ctx.t("cmd_stats_reset_at", { date: dateFormat.format(group.resetAt) })}`
    : "";

  return await ctx.reply(ctx.t("cmd_stats_group", { clowns: clownsText.join("\n"), reset: resetText }), {
    reply_parameters: { message_id: message.message_id, chat_id: message.chat.id },
  });
}

export const cmdStats = new Command<BotContext>("stats", "📊 آمار دلقکشماری") //
  .addToScope({ type: "all_group_chats" }, groupStatsHandler)
  .addToScope({ type: "all_chat_administrators" }, groupStatsHandler);
