import { Bot } from "grammy";

import { config } from "@/config";

import { onClown } from "./handlers/clown";
import { onStart } from "./handlers/start";
import { onStats } from "./handlers/stats";

const bot = new Bot(config.botToken);

bot.command("start", onStart);
bot.command("stats", onStats);

bot.hears(["🤡", "دلقک"], onClown);
bot.command("clown", onClown);

await bot.api.setMyCommands(
  [
    { command: "stats", description: "استارت دلقک‌شماری رو بزن" }, //
  ],
  { scope: { type: "all_private_chats" } },
);

await bot.api.setMyCommands(
  [
    { command: "clown", description: "دلقک گروه رو انتخاب کن" },
    { command: "stats", description: "لیست دلقک‌های برتر گروه" },
  ],
  { scope: { type: "all_group_chats" } },
);

// eslint-disable-next-line no-console
bot.catch(console.error);

bot.start();
