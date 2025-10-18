import type { BotContext } from "@/lib/bot";

export const onPrivacy = async (ctx: BotContext) => {
  return await ctx.reply(ctx.t("cmd_privacy"));
};
