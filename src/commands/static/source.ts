import { Command } from "@grammyjs/commands";

import type { BotContext } from "@/lib/bot";

export const cmdSource = new Command<BotContext>("source", "🪄 سورس‌کد ربات").addToScope(
  { type: "all_private_chats" },
  async (ctx) => await ctx.reply(ctx.t("cmd_source"), { link_preview_options: { is_disabled: true } }),
);
