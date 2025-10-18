import type { BotContext } from "@/lib/bot";

export const onStart = async (ctx: BotContext) => {
  return await ctx.reply(ctx.t("cmd_start"));
};
