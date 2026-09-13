import { runMigrations } from "@/db";
import { Bot, getLocalesDirectory, i18nMiddleware, isInGroup, replyToMiddleware } from "@/lib/bot";
import { config } from "@/lib/config";

import { confirmResetStats, denyResetStats } from "./commands/admin/resetstats";
import { clownHandler, isClownCall, unclownHandler } from "./commands/clown";

const bot = new Bot(config.BOT_TOKEN, {
  plugins: [i18nMiddleware(await getLocalesDirectory()), replyToMiddleware],
});

bot
  .filter(isInGroup) //
  .on("message", isClownCall, async (ctx) =>
    ctx.clownCall === "clown" ? await clownHandler(ctx) : await unclownHandler(ctx),
  )
  .callbackQuery("resetstats:yes", confirmResetStats)
  .callbackQuery("resetstats:no", denyResetStats);

await runMigrations();

await bot.run();
