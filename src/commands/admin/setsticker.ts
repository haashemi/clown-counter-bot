import { Command } from "@grammyjs/commands";

import type { BotContext } from "@/lib/bot";

import { db, schema } from "@/db";

// TODO: Update the texts
async function setStickerHandler(ctx: BotContext) {
  const { msg } = ctx;
  if (!msg) return;

  if (!msg.reply_to_message)
    return await ctx.reply("روی استیکر مورد نظر ریپلای کن و این دستور رو بزن تا به عنوان استیکر دلقک کننده ستش کنی.");

  if (!msg.reply_to_message.sticker) return await ctx.reply("پیامی که روش ریپلای کردی استیکر نیست دلقک.");

  await db
    .insert(schema.groups)
    .values({
      id: msg.chat.id,
      name: msg.chat.title,
      stickerId: msg.reply_to_message.sticker.file_id,
    })
    .onConflictDoUpdate({
      target: [schema.groups.id],
      set: { name: msg.chat.title, stickerId: msg.reply_to_message.sticker.file_id },
    });

  return await ctx.reply("آقا عالی. استیکر جدید برای دلقک کردن ست شد!");
}

export const cmdSetSticker = new Command<BotContext>("setsticker", "ست کردن استیکر برای دلقک کردن") //
  .addToScope({ type: "all_chat_administrators" }, setStickerHandler);
