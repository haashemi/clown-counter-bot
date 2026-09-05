import type { Handler } from "..";

export const privacyHandler: Handler = {
  command: { name: "privacy", description: "🔒 حریم شخصی", scope: { type: "all_private_chats" } },
  handler: async (ctx) => {
    return await ctx.reply(ctx.t("cmd_privacy"));
  },
};
