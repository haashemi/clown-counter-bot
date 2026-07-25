import { Command } from "@grammyjs/commands";

import type { BotContext } from "@/lib/bot";

import { db, schema } from "@/db";

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

  await db
    .insert(schema.groups)
    .values({ id: msg.chat.id, name: msg.chat.title, stickerId: msg.reply_to_message.sticker.file_id })
    .onConflictDoUpdate({
      target: [schema.groups.id],
      set: { name: msg.chat.title, stickerId: msg.reply_to_message.sticker.file_id },
    });

  return await ctx.reply(ctx.t("cmd_setsticker_done"), {
    reply_parameters: { message_id: msg.message_id, chat_id: msg.chat.id },
  });
}

export const cmdSetSticker = new Command<BotContext>("setsticker", "🛡 تنظیم استیکر دلقک کننده گروه") //
  .addToScope({ type: "all_chat_administrators" }, setStickerHandler);
