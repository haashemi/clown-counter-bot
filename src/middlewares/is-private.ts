import type { Context, NextFunction } from "grammy";

export const isPrivate = async (ctx: Context, next: NextFunction): Promise<void> => {
  const isInPrivate = ctx.chat?.type === "private";

  if (isInPrivate) await next();
};
