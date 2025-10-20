import type { NextFunction } from "grammy";

import type { BotContext } from "@/lib/bot";

export async function isGroup(ctx: BotContext, next: NextFunction): Promise<void> {
  const isInGroup = ["group", "supergroup"].includes(ctx.chat?.type ?? "");

  if (isInGroup) await next();
}
