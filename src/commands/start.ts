import { Command } from "@grammyjs/commands";

import type { BotContext } from "@/lib/bot";

export const cmdStart = new Command<BotContext>("start", "🎉 شروع دلقک بازی").addToScope(
  { type: "all_private_chats" },
  async (ctx) => await ctx.reply(ctx.t("cmd_start")),
);
