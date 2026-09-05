import type { Handler } from "..";

export const sourceHandler: Handler = {
  command: { name: "source", description: "🪄 سورس‌کد ربات", scope: { type: "all_private_chats" } },
  handler: async (ctx) => {
    return await ctx.reply(ctx.t("cmd_start"), {
      link_preview_options: { is_disabled: true },
    });
  },
};
