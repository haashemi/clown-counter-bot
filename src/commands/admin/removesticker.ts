import { Command } from "@grammyjs/commands";

import type { BotContext } from "@/lib/bot";

import { db, schema } from "@/db";
import { parseFileIds } from "@/lib/utils";

async function removeStickerHandler(ctx: BotContext) {
  const { msg } = ctx;
  if (!msg) return;

  if (!msg.reply_to_message)
    return await ctx.reply(ctx.t("cmd_removesticker_usage"), {
      reply_parameters: { message_id: msg.message_id, chat_id: msg.chat.id },
    });

  if (!msg.reply_to_message.sticker)
    return await ctx.reply(ctx.t("cmd_removesticker_invalid"), {
      reply_parameters: { message_id: msg.message_id, chat_id: msg.chat.id },
    });

  const group = await db.query.groups.findFirst({
    columns: { stickerIds: true },
    where: (f, o) => o.eq(f.id, msg.chat.id),
  });

  const existing = parseFileIds(group?.stickerIds ?? null);

  if (existing.length === 0)
    return await ctx.reply(ctx.t("cmd_removesticker_empty"), {
      reply_parameters: { message_id: msg.message_id, chat_id: msg.chat.id },
    });

  const fileId = msg.reply_to_message.sticker.file_id;
  const index = existing.indexOf(fileId);

  if (index === -1)
    return await ctx.reply(ctx.t("cmd_removesticker_not_found"), {
      reply_parameters: { message_id: msg.message_id, chat_id: msg.chat.id },
    });

  const updated = existing.filter((id) => id !== fileId);
  const newValue = updated.length > 0 ? JSON.stringify(updated) : null;

  await db
    .insert(schema.groups)
    .values({ id: msg.chat.id, name: msg.chat.title, stickerIds: newValue })
    .onConflictDoUpdate({
      target: [schema.groups.id],
      set: { name: msg.chat.title, stickerIds: newValue },
    });

  return await ctx.reply(ctx.t("cmd_removesticker_done"), {
    reply_parameters: { message_id: msg.message_id, chat_id: msg.chat.id },
  });
}

export const cmdRemoveSticker = new Command<BotContext>("removesticker", "🛡 حذف استیکر دلقک کننده گروه") //
  .addToScope({ type: "all_chat_administrators" }, removeStickerHandler);
