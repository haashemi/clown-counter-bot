import type { CommandHandler } from "@/handlers";

export const sourceHandler: CommandHandler = {
  kind: "command",
  name: "source",
  description: "🪄 سورس‌کد ربات",
  scopes: [{ type: "all_private_chats" }],
  handler: async (ctx) => {
    return await ctx.reply(ctx.t("cmd_start"), {
      link_preview_options: { is_disabled: true },
    });
  },
};
