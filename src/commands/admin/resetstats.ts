import { Command } from "@grammyjs/commands";
import { InlineKeyboard } from "grammy";

import type { BotContext } from "@/lib/bot";

import { db, schema } from "@/db";

const RESET_CALLBACK = "resetstats";

async function resetStatsHandler(ctx: BotContext) {
  const { msg } = ctx;
  if (!msg) return;

  const keyboard = new InlineKeyboard()
    .text(ctx.t("cmd_resetstats_confirm_yes"), `${RESET_CALLBACK}:yes`)
    .text(ctx.t("cmd_resetstats_confirm_no"), `${RESET_CALLBACK}:no`);

  return await ctx.reply(ctx.t("cmd_resetstats_confirm"), {
    reply_markup: keyboard,
    reply_parameters: { message_id: msg.message_id, chat_id: msg.chat.id },
  });
}

async function isAdmin(ctx: BotContext): Promise<boolean> {
  if (!ctx.chat) return false;

  if (ctx.senderChat?.id === ctx.chat.id) {
    return true;
  }

  const author = await ctx.getAuthor();

  return ["administrator", "creator"].includes(author.status);
}

export async function confirmResetStats(ctx: BotContext) {
  const { callbackQuery } = ctx;
  if (!callbackQuery || !callbackQuery.message || !ctx.chat) return;

  if (!(await isAdmin(ctx))) {
    return await ctx.answerCallbackQuery({
      text: ctx.t("cmd_resetstats_not_admin"),
      show_alert: true,
    });
  }

  await db
    .insert(schema.groups)
    .values({ id: ctx.chat.id, name: ctx.chat.title, resetAt: new Date() })
    .onConflictDoUpdate({
      target: schema.groups.id,
      set: { name: ctx.chat.title, resetAt: new Date() },
    });

  await ctx.answerCallbackQuery();

  return await ctx.editMessageText(ctx.t("cmd_resetstats_done"), { reply_markup: new InlineKeyboard() });
}

export async function denyResetStats(ctx: BotContext) {
  const { callbackQuery } = ctx;
  if (!callbackQuery?.message) return;

  await ctx.answerCallbackQuery();

  return await ctx.editMessageText(ctx.t("cmd_resetstats_cancelled"), { reply_markup: new InlineKeyboard() });
}

export const cmdResetStats = new Command<BotContext>("resetstats", "🔄 ریست آمار دلقکها") //
  .addToScope({ type: "all_chat_administrators" }, resetStatsHandler);
