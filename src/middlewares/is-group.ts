import type { Context, NextFunction } from "grammy";

export const isGroup = async (ctx: Context, next: NextFunction): Promise<void> => {
  const isInGroup = ["group", "supergroup"].includes(ctx.chat?.type ?? "");

  if (isInGroup) await next();
};
