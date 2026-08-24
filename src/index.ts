import { run } from "@grammyjs/runner";

import { runMigrations } from "@/db";
import { Bot } from "@/lib/bot";
import { config } from "@/lib/config";

import { commands } from "./commands";
import { confirmResetStats, denyResetStats } from "./commands/admin/resetstats";
import { clownHandler, isClownCall } from "./commands/clown";

const bot = new Bot(config.BOT_TOKEN);

bot.use(commands);

bot
  .filter((ctx) => !!ctx.chat && ["group", "supergroup"].includes(ctx.chat.type))
  .on("message", isClownCall, clownHandler);

bot
  .filter((ctx) => !!ctx.chat && ["group", "supergroup"].includes(ctx.chat.type))
  .callbackQuery("resetstats:yes", confirmResetStats)
  .callbackQuery("resetstats:no", denyResetStats);

await commands.setCommands(bot);

await runMigrations();

run(bot, {
  runner: { fetch: { allowed_updates: ["message", "callback_query"] } },
});
