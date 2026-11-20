import type { Message } from "grammy/types";

import { and, asc, count, eq } from "drizzle-orm";
import { GrammyError, InlineKeyboard } from "grammy";

import type { CallbackQueryHandler, CommandHandler } from "@/handlers";
import type { BotContext, ClownCall } from "@/lib/bot";

import { db, saveGroup, schema } from "@/db";
import { ADMIN, isAdmin } from "@/lib/bot";
import { messageMedia } from "@/lib/media-key";

/** Per group, per media type and action (e.g. at most 3 clown stickers). */
const MAX_PER_KIND = 3;

const { groupTriggers } = schema;
type Trigger = typeof groupTriggers.$inferSelect;

const byKey = (chatId: number, key: string) => and(eq(groupTriggers.groupId, chatId), eq(groupTriggers.key, key));

async function findTrigger(chatId: number, key: string): Promise<Trigger | null> {
  const [row] = await db.select().from(groupTriggers).where(byKey(chatId, key));
  return row ?? null;
}

/** First capture group of the callback data pattern. */
const matchArg = (ctx: BotContext) => (typeof ctx.match === "object" ? ctx.match[1] : undefined);

async function adminOnly(ctx: BotContext): Promise<boolean> {
  if (await isAdmin(ctx)) return true;
  await ctx.answerCallbackQuery({ text: ctx.t("trigger_not_admin"), show_alert: true });
  return false;
}

// ---- /trigger: reply to a gif/sticker, pick its action with buttons ----

function prompt(ctx: BotContext, media: string, action: ClownCall | undefined) {
  const keyboard = new InlineKeyboard();
  if (action !== "clown") keyboard.text(ctx.t("trigger_btn_clown"), "trigger:set:clown");
  if (action !== "unclown") keyboard.text(ctx.t("trigger_btn_unclown"), "trigger:set:unclown");
  if (action) keyboard.text(ctx.t("trigger_btn_remove"), "trigger:remove");

  return [ctx.t("cmd_trigger_prompt", { media, state: action ?? "none" }), { reply_markup: keyboard }] as const;
}

async function promptTrigger(ctx: BotContext) {
  const { msg } = ctx;
  if (!msg) return;

  const target = msg.reply_to_message;
  const media = messageMedia(target);
  if (!target || !media) return ctx.replyTo(msg, ctx.t("cmd_trigger_usage", { max: MAX_PER_KIND }));

  const current = await findTrigger(msg.chat.id, media.key);

  // Reply to the media itself: the button's callback message then carries it in `reply_to_message`.
  return ctx.replyTo(target, ...prompt(ctx, media.media, current?.action));
}

async function applyChoice(ctx: BotContext) {
  const { chat, callbackQuery } = ctx;
  if (!chat || !callbackQuery || !(await adminOnly(ctx))) return;

  const promptMsg = callbackQuery.message;
  const media = messageMedia(promptMsg && "reply_to_message" in promptMsg ? promptMsg.reply_to_message : undefined);
  if (!media) {
    await ctx.answerCallbackQuery({ text: ctx.t("trigger_gone"), show_alert: true });
    return ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
  }

  const action = matchArg(ctx) as ClownCall | undefined;

  if (!action) {
    await db.delete(groupTriggers).where(byKey(chat.id, media.key));
    await ctx.answerCallbackQuery({ text: ctx.t("trigger_removed") });
    return ctx.editMessageText(...prompt(ctx, media.media, undefined));
  }

  const current = await findTrigger(chat.id, media.key);
  if (current?.action !== action) {
    const [used] = await db
      .select({ n: count() })
      .from(groupTriggers)
      .where(
        and(eq(groupTriggers.groupId, chat.id), eq(groupTriggers.media, media.media), eq(groupTriggers.action, action)),
      );
    if ((used?.n ?? 0) >= MAX_PER_KIND) {
      return ctx.answerCallbackQuery({ text: ctx.t("trigger_limit", { max: MAX_PER_KIND }), show_alert: true });
    }
  }

  await saveGroup(chat.id, chat.title);
  await db
    .insert(groupTriggers)
    .values({ groupId: chat.id, ...media, action })
    .onConflictDoUpdate({
      target: [groupTriggers.groupId, groupTriggers.key],
      set: { action, media: media.media, fileId: media.fileId },
    });

  await ctx.answerCallbackQuery({ text: ctx.t("trigger_saved") });
  return ctx.editMessageText(...prompt(ctx, media.media, action));
}

// ---- /triggers: list every trigger with a delete button ----

async function sendTrigger(ctx: BotContext, row: Trigger): Promise<Message> {
  const reply_markup = new InlineKeyboard().text(
    ctx.t("triggers_btn_delete", { action: row.action }),
    `trigger:del:${row.key}`,
  );

  if (row.fileId) {
    try {
      return await (row.media === "animation"
        ? ctx.replyWithAnimation(row.fileId, { reply_markup })
        : ctx.replyWithSticker(row.fileId, { reply_markup }));
    } catch (error) {
      // A stale file_id: fall back to a text entry so the trigger can still be deleted.
      if (!(error instanceof GrammyError)) throw error;
    }
  }

  return ctx.reply(ctx.t("triggers_no_preview", { media: row.media }), { reply_markup });
}

async function listTriggers(ctx: BotContext) {
  const { msg } = ctx;
  if (!msg) return;

  const rows = await db
    .select()
    .from(groupTriggers)
    .where(eq(groupTriggers.groupId, msg.chat.id))
    .orderBy(asc(groupTriggers.action), asc(groupTriggers.media));
  if (rows.length === 0) return ctx.replyTo(msg, ctx.t("cmd_triggers_empty"));

  for (const row of rows) {
    // oxlint-disable-next-line no-await-in-loop -- keep the list in order.
    await sendTrigger(ctx, row);
  }

  return ctx.reply(ctx.t("cmd_triggers_summary", { count: rows.length }), {
    reply_markup: new InlineKeyboard().text(ctx.t("triggers_btn_clear"), "trigger:clear"),
  });
}

async function deleteListed(ctx: BotContext) {
  const key = matchArg(ctx);
  if (!ctx.chat || !key || !(await adminOnly(ctx))) return;

  await db.delete(groupTriggers).where(byKey(ctx.chat.id, key));
  await ctx.answerCallbackQuery({ text: ctx.t("trigger_removed") });

  // Bots may delete their own group messages only for 48 hours; after that just drop the button.
  try {
    return await ctx.deleteMessage();
  } catch (error) {
    if (!(error instanceof GrammyError)) throw error;
    return ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
  }
}

async function askClear(ctx: BotContext) {
  if (!(await adminOnly(ctx))) return;

  await ctx.answerCallbackQuery();
  const keyboard = new InlineKeyboard()
    .text(ctx.t("triggers_clear_yes"), "trigger:clear:yes")
    .text(ctx.t("triggers_clear_no"), "trigger:clear:no");
  return ctx.editMessageText(ctx.t("triggers_clear_confirm"), { reply_markup: keyboard });
}

async function confirmClear(ctx: BotContext) {
  if (!ctx.chat || !(await adminOnly(ctx))) return;

  await db.delete(groupTriggers).where(eq(groupTriggers.groupId, ctx.chat.id));
  await ctx.answerCallbackQuery();
  return ctx.editMessageText(ctx.t("triggers_cleared"), { reply_markup: new InlineKeyboard() });
}

async function cancelClear(ctx: BotContext) {
  if (!(await adminOnly(ctx))) return;

  await ctx.answerCallbackQuery();
  return ctx.editMessageText(ctx.t("triggers_clear_cancelled"), { reply_markup: new InlineKeyboard() });
}

export const triggerHandlers: CommandHandler[] = [
  {
    kind: "command",
    name: "trigger",
    description: "🛡 تنظیم گیف/استیکر دلقک (روی گیف/استیکر ریپلای کن)",
    scopes: ADMIN,
    handler: promptTrigger,
  },
  {
    kind: "command",
    name: "triggers",
    description: "🛡 لیست و حذف گیف/استیکرهای دلقک",
    scopes: ADMIN,
    handler: listTriggers,
  },
];

export const triggerCallbacks: CallbackQueryHandler[] = [
  { kind: "callback_query", data: /^trigger:set:(clown|unclown)$/, handler: applyChoice },
  { kind: "callback_query", data: "trigger:remove", handler: applyChoice },
  { kind: "callback_query", data: /^trigger:del:(-?\d+)$/, handler: deleteListed },
  { kind: "callback_query", data: "trigger:clear", handler: askClear },
  { kind: "callback_query", data: "trigger:clear:yes", handler: confirmClear },
  { kind: "callback_query", data: "trigger:clear:no", handler: cancelClear },
];
