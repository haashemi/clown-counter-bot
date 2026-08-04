import { Command } from "@grammyjs/commands";

import type { BotContext } from "@/lib/bot";

import { db, schema } from "@/db";

const MIN_DELAY = 5;
const MAX_DELAY = 60;

async function setClownDelayHandler(ctx: BotContext) {
  const { msg } = ctx;
  if (!msg) return;

  const args = msg.text?.split(/\s+/).slice(1).join(" ").trim();

  if (!args) {
    return await ctx.reply(ctx.t("cmd_setclowndelay_usage"), {
      reply_parameters: { message_id: msg.message_id, chat_id: msg.chat.id },
    });
  }

  const minutes = Number(args);

  if (Number.isNaN(minutes) || !Number.isInteger(minutes)) {
    return await ctx.reply(ctx.t("cmd_setclowndelay_invalid_number"), {
      reply_parameters: { message_id: msg.message_id, chat_id: msg.chat.id },
    });
  }

  if (minutes < MIN_DELAY || minutes > MAX_DELAY) {
    return await ctx.reply(ctx.t("cmd_setclowndelay_out_of_range", { min: MIN_DELAY, max: MAX_DELAY }), {
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

  return await ctx.reply(ctx.t("cmd_setclowndelay_done", { minutes }), {
    reply_parameters: { message_id: msg.message_id, chat_id: msg.chat.id },
  });
}

export const cmdSetClownDelay = new Command<BotContext>("setclowndelay", "⏱ تنظیم زمان انتظار دلقک") //
  .addToScope({ type: "all_chat_administrators" }, setClownDelayHandler);
