import type { BotContext } from "@/lib/bot";

export async function onStart(ctx: BotContext) {
  return await ctx.reply(ctx.t("cmd_start"));
}
