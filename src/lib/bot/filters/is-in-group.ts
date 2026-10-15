import type { MiddlewareFn } from "grammy";

import type { BotContext } from "..";

export const isInGroup: MiddlewareFn<BotContext> = async (ctx, next) => {
  if (ctx.chat?.type === "group" || ctx.chat?.type === "supergroup") {
    await next();
  }
};
