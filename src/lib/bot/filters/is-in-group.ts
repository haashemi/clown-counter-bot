import type { BotContext } from "..";

export function isInGroup(ctx: BotContext) {
  return !!ctx.chat && ["group", "supergroup"].includes(ctx.chat.type);
}
