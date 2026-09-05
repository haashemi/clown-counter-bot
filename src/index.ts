import type { BotContext } from "@/lib/bot";

import { runMigrations } from "@/db";
import { Bot } from "@/lib/bot";
import { config } from "@/lib/config";

import { commands } from "./commands";
import { confirmResetStats, denyResetStats } from "./commands/admin/resetstats";
import { clownHandler, isClownCall, unclownHandler } from "./commands/clown";
import { isInGroup } from "./lib/bot/filters/is-in-group";
import { getLocalesDirectory, i18nMiddleware } from "./lib/bot/plugins/i18n";
import { replyToMiddleware } from "./lib/bot/plugins/reply-to";

const bot = new Bot(config.BOT_TOKEN, {
  plugins: [i18nMiddleware(await getLocalesDirectory()), replyToMiddleware],
  commands,
});

const routeClownCall = (ctx: BotContext) => (ctx.clownCall === "unclown" ? unclownHandler(ctx) : clownHandler(ctx));

bot
  .filter(isInGroup) //
  .on("message", isClownCall, routeClownCall)
  .callbackQuery("resetstats:yes", confirmResetStats)
  .callbackQuery("resetstats:no", denyResetStats);

await runMigrations();

await bot.run();
