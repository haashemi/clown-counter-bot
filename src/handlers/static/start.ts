import type { Handler } from "..";

export const startHandler: Handler = {
  command: { name: "start", description: "🎉 شروع دلقک بازی", scope: { type: "all_private_chats" } },
  handler: async (ctx) => {
    return await ctx.reply(ctx.t("cmd_start"));
  },
};
