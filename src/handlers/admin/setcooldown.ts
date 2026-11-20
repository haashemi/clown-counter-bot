import type { CommandHandler } from "@/handlers";
import type { BotContext } from "@/lib/bot";

import { db, schema } from "@/db";

const MIN_COOLDOWN = 0;
const MAX_COOLDOWN = 60;

async function setCooldown(ctx: BotContext) {
  const { msg } = ctx;
  if (!msg) return;

  const args = msg.text?.split(/\s+/).slice(1).join(" ").trim();

  if (!args) {
    return ctx.reply(ctx.t("cmd_setcooldown_usage", { min: MIN_COOLDOWN, max: MAX_COOLDOWN }), {
      reply_parameters: { message_id: msg.message_id, chat_id: msg.chat.id },
    });
  }

  // Persian (۰-۹) and Arabic-Indic (٠-٩) digits → ASCII.
  const digits = args
    .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));

  if (!/^\d+$/.test(digits)) {
    return ctx.reply(ctx.t("cmd_setcooldown_invalid_number"), {
      reply_parameters: { message_id: msg.message_id, chat_id: msg.chat.id },
    });
  }

  const minutes = Number(digits);

  if (minutes < MIN_COOLDOWN || minutes > MAX_COOLDOWN) {
    return ctx.reply(ctx.t("cmd_setcooldown_out_of_range", { min: MIN_COOLDOWN, max: MAX_COOLDOWN }), {
      reply_parameters: { message_id: msg.message_id, chat_id: msg.chat.id },
    });
  }

  const cooldownMs = minutes * 60 * 1000;

  await db
    .insert(schema.groups)
    .values({ id: msg.chat.id, name: msg.chat.title, cooldown: cooldownMs })
    .onConflictDoUpdate({
      target: [schema.groups.id],
      set: { name: msg.chat.title, cooldown: cooldownMs },
    });

  return ctx.reply(ctx.t("cmd_setcooldown_done", { minutes }), {
    reply_parameters: { message_id: msg.message_id, chat_id: msg.chat.id },
  });
}

export const setCooldownHandler: CommandHandler = {
  kind: "command",
  name: "setcooldown",
  description: "⏱ تنظیم زمان انتظار دلقک",
  scopes: [{ type: "all_chat_administrators" }],
  handler: setCooldown,
};
