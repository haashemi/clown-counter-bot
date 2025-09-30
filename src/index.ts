import { Bot } from "grammy";

import { config } from "@/config";

import { onClown, onPrivacy, onStart, onStats } from "./handlers";

const bot = new Bot(config.botToken);

bot.command("start", onStart);
bot.command("privacy", onPrivacy);

bot.hears(["🤡", "دلقک"], onClown);
bot.command("clown", onClown);
bot.command("stats", onStats);

await bot.api.setMyCommands(
  [
    { command: "start", description: "🎉 شروع دلقک بازی" },
    { command: "privacy", description: "🔒 حریم شخصی" },
  ],
  { scope: { type: "all_private_chats" } },
);

await bot.api.setMyCommands(
  [
    { command: "clown", description: "🤡 دلقک یافت شد!" },
    { command: "stats", description: "📊 لیست دلقک‌های برتر گروه" },
  ],
  { scope: { type: "all_group_chats" } },
);

// eslint-disable-next-line no-console
bot.catch(console.error);

bot.start();
