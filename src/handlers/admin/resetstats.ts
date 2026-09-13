import { InlineKeyboard } from "grammy";

import type { CallbackQueryHandler, CommandHandler } from "@/handlers";
import type { BotContext } from "@/lib/bot";

import { db, schema } from "@/db";
import { isAdmin } from "@/lib/bot";

const RESET_CALLBACK = "resetstats";

const yesData = `${RESET_CALLBACK}:yes`;
const noData = `${RESET_CALLBACK}:no`;

async function promptResetStats(ctx: BotContext) {
  const { msg } = ctx;
  if (!msg) return;

  const keyboard = new InlineKeyboard()
    .text(ctx.t("cmd_resetstats_confirm_yes"), yesData)
    .text(ctx.t("cmd_resetstats_confirm_no"), noData);

  return await ctx.reply(ctx.t("cmd_resetstats_confirm"), {
    reply_markup: keyboard,
    reply_parameters: { message_id: msg.message_id, chat_id: msg.chat.id },
  });
}

async function confirmResetStats(ctx: BotContext) {
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

async function denyResetStats(ctx: BotContext) {
  const { callbackQuery } = ctx;
  if (!callbackQuery?.message) return;

  await ctx.answerCallbackQuery();

  return await ctx.editMessageText(ctx.t("cmd_resetstats_cancelled"), { reply_markup: new InlineKeyboard() });
}

export const resetStatsHandler: CommandHandler = {
  kind: "command",
  name: "resetstats",
  description: "🔄 ریست آمار دلقک‌ها",
  scopes: [{ type: "all_chat_administrators" }],
  handler: promptResetStats,
};

export const resetStatsCallbacks: CallbackQueryHandler[] = [
  { kind: "callback_query", data: yesData, handler: confirmResetStats },
  { kind: "callback_query", data: noData, handler: denyResetStats },
];
