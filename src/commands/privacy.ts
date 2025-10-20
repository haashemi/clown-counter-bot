import { Command } from "@grammyjs/commands";

import type { BotContext } from "@/lib/bot";

export const cmdPrivacy = new Command<BotContext>("privacy", "🔒 حریم شخصی").addToScope(
  { type: "all_private_chats" },
  async (ctx) => await ctx.reply(ctx.t("cmd_privacy")),
);
