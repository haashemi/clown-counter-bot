import { Command } from "@grammyjs/commands";

import type { BotContext } from "@/lib/bot";

import { db, schema } from "@/db";
import { parseFileIds } from "@/lib/utils";

const MAX_GIFS = 3;

async function setGifHandler(ctx: BotContext) {
  const { msg } = ctx;
  if (!msg) return;

  if (!msg.reply_to_message)
    return await ctx.reply(ctx.t("cmd_setgif"), {
      reply_parameters: { message_id: msg.message_id, chat_id: msg.chat.id },
    });

  if (!msg.reply_to_message.animation)
    return await ctx.reply(ctx.t("cmd_setgif_invalid"), {
      reply_parameters: { message_id: msg.message_id, chat_id: msg.chat.id },
    });

  const group = await db.query.groups.findFirst({
    columns: { gifIds: true },
    where: (f, o) => o.eq(f.id, msg.chat.id),
  });

  const existing = parseFileIds(group?.gifIds ?? null);

  if (existing.length >= MAX_GIFS)
    return await ctx.reply(ctx.t("cmd_setgif_limit"), {
      reply_parameters: { message_id: msg.message_id, chat_id: msg.chat.id },
    });

  const newId = msg.reply_to_message.animation.file_id;
  const updated = [...existing, newId];

  await db
    .insert(schema.groups)
    .values({ id: msg.chat.id, name: msg.chat.title, gifIds: JSON.stringify(updated) })
    .onConflictDoUpdate({
      target: [schema.groups.id],
      set: { name: msg.chat.title, gifIds: JSON.stringify(updated) },
    });

  return await ctx.reply(ctx.t("cmd_setgif_done", { count: updated.length, max: MAX_GIFS }), {
    reply_parameters: { message_id: msg.message_id, chat_id: msg.chat.id },
  });
}

export const cmdSetGif = new Command<BotContext>("setgif", "🛡 تنظیم گیف دلقک کننده گروه") //
  .addToScope({ type: "all_chat_administrators" }, setGifHandler);
