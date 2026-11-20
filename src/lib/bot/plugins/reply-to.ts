import type { Context, NextFunction } from "grammy";
import type { Message } from "grammy/types";

import type { BotContext } from "..";

type ReplyOptions = Parameters<Context["reply"]>[1];

export interface ReplyToFlavor {
  replyTo: (msg: Message | undefined, text: string, other?: ReplyOptions) => Promise<Message.TextMessage>;
}

export async function replyToMiddleware(ctx: BotContext, next: NextFunction) {
  ctx.replyTo = async (msg, text, other) =>
    ctx.reply(text, {
      ...other,
      ...(msg && { reply_parameters: { message_id: msg.message_id, chat_id: msg.chat.id } }),
    });
  await next();
}
