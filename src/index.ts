import { run } from "@grammyjs/runner";

import { Bot } from "@/lib/bot";
import { config } from "@/lib/config";

import { commands } from "./commands";
import { clownHandler, isClownCall } from "./commands/clown";

const bot = new Bot(config.BOT_TOKEN);

bot.use(commands);

bot
  .filter((ctx) => !!ctx.chat && ["group", "supergroup"].includes(ctx.chat.type))
  .on("message", isClownCall, clownHandler);

await commands.setCommands(bot);

run(bot, {
  runner: { fetch: { allowed_updates: ["message"] } },
});
