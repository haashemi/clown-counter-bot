import type { CommandHandler } from "@/handlers";

export const privacyHandler: CommandHandler = {
  kind: "command",
  name: "privacy",
  description: "🔒 حریم شخصی",
  scopes: [{ type: "all_private_chats" }],
  handler: async (ctx) => {
    return await ctx.reply(ctx.t("cmd_privacy"));
  },
};
