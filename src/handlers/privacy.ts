import type { BotContext } from "@/lib/bot";

export async function onPrivacy(ctx: BotContext) {
  return await ctx.reply(ctx.t("cmd_privacy"));
}
