import type { NextFunction } from "grammy";

import type { BotContext } from "@/lib/bot";

export const isPrivate = async (ctx: BotContext, next: NextFunction): Promise<void> => {
  const isInPrivate = ctx.chat?.type === "private";

  if (isInPrivate) await next();
};
