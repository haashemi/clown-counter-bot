import { InlineKeyboard } from "grammy";

import type { CallbackQueryHandler, CommandHandler } from "@/handlers";
import type { BotContext } from "@/lib/bot";

import { saveGroup } from "@/db";
import { ADMIN, isAdmin } from "@/lib/bot";

const RESET_CALLBACK = "resetstats";

const yesData = `${RESET_CALLBACK}:yes`;
const noData = `${RESET_CALLBACK}:no`;

async function promptResetStats(ctx: BotContext) {
  const { msg } = ctx;
  if (!msg) return;

  const keyboard = new InlineKeyboard()
    .text(ctx.t("cmd_resetstats_confirm_yes"), yesData)
    .text(ctx.t("cmd_resetstats_confirm_no"), noData);

  return ctx.replyTo(msg, ctx.t("cmd_resetstats_confirm"), { reply_markup: keyboard });
}

async function confirmResetStats(ctx: BotContext) {
  const { callbackQuery } = ctx;
  if (!callbackQuery?.message || !ctx.chat) return;

  if (!(await isAdmin(ctx))) {
    return ctx.answerCallbackQuery({
      text: ctx.t("cmd_resetstats_not_admin"),
      show_alert: true,
    });
  }

  await saveGroup(ctx.chat.id, ctx.chat.title, { resetAt: new Date() });

  await ctx.answerCallbackQuery();

  return ctx.editMessageText(ctx.t("cmd_resetstats_done"), { reply_markup: new InlineKeyboard() });
}

async function denyResetStats(ctx: BotContext) {
  const { callbackQuery } = ctx;
  if (!callbackQuery?.message) return;

  await ctx.answerCallbackQuery();

  return ctx.editMessageText(ctx.t("cmd_resetstats_cancelled"), { reply_markup: new InlineKeyboard() });
}

export const resetStatsHandler: CommandHandler = {
  kind: "command",
  name: "resetstats",
  description: "🔄 ریست آمار دلقک‌ها",
  scopes: ADMIN,
  handler: promptResetStats,
};

export const resetStatsCallbacks: CallbackQueryHandler[] = [
  { kind: "callback_query", data: yesData, handler: confirmResetStats },
  { kind: "callback_query", data: noData, handler: denyResetStats },
];
