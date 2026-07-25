import { Command } from "@grammyjs/commands";

import type { BotContext } from "@/lib/bot";

import { config } from "@/lib/config";

async function metaHandler(ctx: BotContext) {
  const { msg } = ctx;
  if (!msg || !msg.reply_to_message) return;

  const replyMeta = JSON.stringify(msg.reply_to_message, null, "  ");

  return await ctx.reply(`<code>${replyMeta}</code>`, {
    reply_parameters: { chat_id: msg.chat.id, message_id: msg.message_id },
  });
}

export const cmdMeta = new Command<BotContext>("meta", "Message minimal meta") //
  .addToScope({ type: "chat", chat_id: config.BOT_SUPERUSER }, metaHandler);
