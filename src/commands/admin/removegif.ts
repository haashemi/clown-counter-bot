import { Command } from "@grammyjs/commands";

import type { BotContext } from "@/lib/bot";

import { db, schema } from "@/db";
import { parseFileIds } from "@/lib/utils";

async function removeGifHandler(ctx: BotContext) {
  const { msg } = ctx;
  if (!msg) return;

  if (!msg.reply_to_message)
    return await ctx.reply(ctx.t("cmd_removegif_usage"), {
      reply_parameters: { message_id: msg.message_id, chat_id: msg.chat.id },
    });

  if (!msg.reply_to_message.animation)
    return await ctx.reply(ctx.t("cmd_removegif_invalid"), {
      reply_parameters: { message_id: msg.message_id, chat_id: msg.chat.id },
    });

  const group = await db.query.groups.findFirst({
    columns: { gifIds: true },
    where: (f, o) => o.eq(f.id, msg.chat.id),
  });

  const existing = parseFileIds(group?.gifIds ?? null);

  if (existing.length === 0)
    return await ctx.reply(ctx.t("cmd_removegif_empty"), {
      reply_parameters: { message_id: msg.message_id, chat_id: msg.chat.id },
    });

  const fileId = msg.reply_to_message.animation.file_id;
  const index = existing.indexOf(fileId);

  if (index === -1)
    return await ctx.reply(ctx.t("cmd_removegif_not_found"), {
      reply_parameters: { message_id: msg.message_id, chat_id: msg.chat.id },
    });

  const updated = existing.filter((id) => id !== fileId);
  const newValue = updated.length > 0 ? JSON.stringify(updated) : null;

  await db
    .insert(schema.groups)
    .values({ id: msg.chat.id, name: msg.chat.title, gifIds: newValue })
    .onConflictDoUpdate({
      target: [schema.groups.id],
      set: { name: msg.chat.title, gifIds: newValue },
    });

  return await ctx.reply(ctx.t("cmd_removegif_done"), {
    reply_parameters: { message_id: msg.message_id, chat_id: msg.chat.id },
  });
}

export const cmdRemoveGif = new Command<BotContext>("removegif", "🛡 حذف گیف دلقک کننده گروه") //
  .addToScope({ type: "all_chat_administrators" }, removeGifHandler);
