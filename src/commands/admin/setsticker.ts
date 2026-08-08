import { Command } from "@grammyjs/commands";

import type { BotContext } from "@/lib/bot";

import { db, schema } from "@/db";
import { parseFileIds } from "@/lib/utils";

const MAX_STICKERS = 3;

async function setStickerHandler(ctx: BotContext) {
  const { msg } = ctx;
  if (!msg) return;

  if (!msg.reply_to_message)
    return await ctx.reply(ctx.t("cmd_setsticker"), {
      reply_parameters: { message_id: msg.message_id, chat_id: msg.chat.id },
    });

  if (!msg.reply_to_message.sticker)
    return await ctx.reply(ctx.t("cmd_setsticker_invalid"), {
      reply_parameters: { message_id: msg.message_id, chat_id: msg.chat.id },
    });

  const group = await db.query.groups.findFirst({
    columns: { stickerIds: true },
    where: (f, o) => o.eq(f.id, msg.chat.id),
  });

  const existing = parseFileIds(group?.stickerIds ?? null);

  if (existing.length >= MAX_STICKERS)
    return await ctx.reply(ctx.t("cmd_setsticker_limit"), {
      reply_parameters: { message_id: msg.message_id, chat_id: msg.chat.id },
    });

  const newId = msg.reply_to_message.sticker.file_id;
  const updated = [...existing, newId];

  await db
    .insert(schema.groups)
    .values({ id: msg.chat.id, name: msg.chat.title, stickerIds: JSON.stringify(updated) })
    .onConflictDoUpdate({
      target: [schema.groups.id],
      set: { name: msg.chat.title, stickerIds: JSON.stringify(updated) },
    });

  return await ctx.reply(ctx.t("cmd_setsticker_done", { count: updated.length, max: MAX_STICKERS }), {
    reply_parameters: { message_id: msg.message_id, chat_id: msg.chat.id },
  });
}

export const cmdSetSticker = new Command<BotContext>("setsticker", "🛡 تنظیم استیکر دلقک کننده گروه") //
  .addToScope({ type: "all_chat_administrators" }, setStickerHandler);
