import type { CommandHandler } from "@/handlers";
import type { BotContext } from "@/lib/bot";

import { PRIVATE } from "@/lib/bot";

function textCommand(
  name: string,
  description: string,
  key: string,
  other?: Parameters<BotContext["replyTo"]>[2],
): CommandHandler {
  return {
    kind: "command",
    name,
    description,
    scopes: PRIVATE,
    handler: async (ctx) => ctx.replyTo(ctx.msg, ctx.t(key), other),
  };
}

export const staticHandlers: CommandHandler[] = [
  textCommand("start", "🎉 شروع دلقک بازی", "cmd_start"),
  textCommand("source", "🪄 سورس‌کد ربات", "cmd_source", { link_preview_options: { is_disabled: true } }),
  textCommand("privacy", "🔒 حریم شخصی", "cmd_privacy"),
];
