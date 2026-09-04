import { run } from "@grammyjs/runner";

import type { BotContext } from "@/lib/bot";

import { runMigrations } from "@/db";
import { Bot, getLocalesDirectory } from "@/lib/bot";
import { config } from "@/lib/config";

import { commands } from "./commands";
import { confirmResetStats, denyResetStats } from "./commands/admin/resetstats";
import { clownHandler, isClownCall, unclownHandler } from "./commands/clown";

const bot = new Bot(config.BOT_TOKEN, await getLocalesDirectory());

bot.use(commands);

const routeClownCall = (ctx: BotContext) => (ctx.clownCall === "unclown" ? unclownHandler(ctx) : clownHandler(ctx));

bot
  .filter((ctx) => !!ctx.chat && ["group", "supergroup"].includes(ctx.chat.type))
  .on("message", isClownCall, routeClownCall);

bot
  .filter((ctx) => !!ctx.chat && ["group", "supergroup"].includes(ctx.chat.type))
  .callbackQuery("resetstats:yes", confirmResetStats)
  .callbackQuery("resetstats:no", denyResetStats);

await runMigrations();

await commands.setCommands(bot);

run(bot, {
  runner: { fetch: { allowed_updates: ["message", "callback_query"] } },
});
