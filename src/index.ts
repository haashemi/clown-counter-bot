import { Bot } from "@/lib/bot";
import { config } from "@/lib/config";

import { commands } from "./commands";
import { clownHandler } from "./commands/clown";

const bot = new Bot(config.botToken);

await commands.setCommands(bot);

bot.use(commands);

bot.filter((ctx) => ["group", "supergroup"].includes(ctx.chat?.type ?? "")).hears(["🤡", "دلقک"], clownHandler);

bot.start();
