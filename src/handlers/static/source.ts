import type { CommandHandler } from "@/handlers";

export const sourceHandler: CommandHandler = {
  kind: "command",
  name: "source",
  description: "🪄 سورس‌کد ربات",
  scopes: [{ type: "all_private_chats" }],
  handler: async (ctx) => {
    return await ctx.reply(ctx.t("cmd_start"), {
      link_preview_options: { is_disabled: true },
      ...(ctx.msg ? { reply_parameters: { message_id: ctx.msg.message_id, chat_id: ctx.msg.chat.id } } : {}),
    });
  },
};
