import type { BotContext } from "@/lib/bot";

export async function onSource(ctx: BotContext) {
  return await ctx.reply(ctx.t("cmd_source"), { link_preview_options: { is_disabled: true } });
}
