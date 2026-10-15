import type { CommandHandler } from "@/handlers";

export const startHandler: CommandHandler = {
  kind: "command",
  name: "start",
  description: "🎉 شروع دلقک بازی",
  scopes: [{ type: "all_private_chats" }],
  handler: async (ctx) => {
    return await ctx.replyTo(ctx.msg, ctx.t("cmd_start"));
  },
};
