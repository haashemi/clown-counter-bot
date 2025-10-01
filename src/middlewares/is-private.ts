import type { Context, NextFunction } from "grammy";

export const isPrivate = async (ctx: Context, next: NextFunction): Promise<void> => {
  const isInPrivate = ctx.chatId === ctx.senderChat?.id;

  if (isInPrivate) await next();
};
