import type { CommandHandler } from "@/handlers";
import type { BotContext } from "@/lib/bot";

import { saveGroup } from "@/db";
import { ADMIN } from "@/lib/bot";

const MIN_COOLDOWN = 0;
const MAX_COOLDOWN = 60;

async function setCooldown(ctx: BotContext) {
  const { msg } = ctx;
  if (!msg) return;

  const args = msg.text?.split(/\s+/).slice(1).join(" ").trim();

  if (!args) {
    return ctx.replyTo(msg, ctx.t("cmd_setcooldown_usage", { min: MIN_COOLDOWN, max: MAX_COOLDOWN }));
  }

  // Persian (۰-۹) and Arabic-Indic (٠-٩) digits → ASCII.
  const digits = args
    .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));

  if (!/^\d+$/.test(digits)) {
    return ctx.replyTo(msg, ctx.t("cmd_setcooldown_invalid_number"));
  }

  const minutes = Number(digits);

  if (minutes < MIN_COOLDOWN || minutes > MAX_COOLDOWN) {
    return ctx.replyTo(msg, ctx.t("cmd_setcooldown_out_of_range", { min: MIN_COOLDOWN, max: MAX_COOLDOWN }));
  }

  const cooldownMs = minutes * 60 * 1000;

  await saveGroup(msg.chat.id, msg.chat.title, { cooldown: cooldownMs });

  return ctx.replyTo(msg, ctx.t("cmd_setcooldown_done", { minutes }));
}

export const setCooldownHandler: CommandHandler = {
  kind: "command",
  name: "setcooldown",
  description: "⏱ تنظیم زمان انتظار دلقک",
  scopes: ADMIN,
  handler: setCooldown,
};
