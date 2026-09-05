import type { NextFunction } from "grammy";
import type { Message } from "grammy/types";

import type { BotContext } from "..";

export interface ReplyToFlavor {
  replyTo: (msg: Message | undefined, text: string) => Promise<Message.TextMessage>;
}

export async function replyToMiddleware(ctx: BotContext, next: NextFunction) {
  ctx.replyTo = async (msg, text) => {
    return await ctx.reply(
      text,
      msg ? { reply_parameters: { message_id: msg.message_id, chat_id: msg.chat.id } } : undefined,
    );
  };

  await next();
}
