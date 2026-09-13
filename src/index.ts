import { runMigrations } from "@/db";
import { handlers } from "@/handlers";
import { Bot, getLocalesDirectory, i18nMiddleware, replyToMiddleware } from "@/lib/bot";
import { config } from "@/lib/config";

const bot = new Bot(config.BOT_TOKEN, {
  plugins: [i18nMiddleware(await getLocalesDirectory()), replyToMiddleware],
});

bot.registerHandlers(...handlers);

await runMigrations();

await bot.run();
