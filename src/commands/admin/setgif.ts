import { Command } from "@grammyjs/commands";

import type { BotContext } from "@/lib/bot";

import { db, schema } from "@/db";

// TODO: Update the texts
async function setGifHandler(ctx: BotContext) {
  const { msg } = ctx;
  if (!msg) return;

  if (!msg.reply_to_message)
    return await ctx.reply("روی گیف مورد نظر ریپلای کن و این دستور رو بزن تا به عنوان گیف دلقک کننده ستش کنی.");

  if (!msg.reply_to_message.animation) return await ctx.reply("پیامی که روش ریپلای کردی گیف نیست دلقک.");

  await db
    .insert(schema.groups)
    .values({
      id: msg.chat.id,
      name: msg.chat.title,
      gifId: msg.reply_to_message.animation.file_id,
    })
    .onConflictDoUpdate({
      target: [schema.groups.id],
      set: { name: msg.chat.title, gifId: msg.reply_to_message.animation.file_id },
    });

  return await ctx.reply("آقا عالی. گیف جدید برای دلقک کردن ست شد!");
}

export const cmdSetGif = new Command<BotContext>("setgif", "ست کردن گیف برای دلقک کردن") //
  .addToScope({ type: "all_chat_administrators" }, setGifHandler);
