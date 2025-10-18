import { config } from "@/config";
import { Bot } from "@/lib/bot";
import { isGroup, isPrivate } from "@/middlewares";

import { onClown, onPrivacy, onSource, onStart, onStats } from "./handlers";

const bot = new Bot(config.botToken);

bot.command("start", isPrivate, onStart);
bot.command("privacy", isPrivate, onPrivacy);
bot.command("source", isPrivate, onSource);

bot.command("clown", isGroup, onClown);
bot.command("stats", isGroup, onStats);
bot.hears(["🤡", "دلقک"], isGroup, onClown);

await bot.api.setMyCommands(
  [
    { command: "start", description: "🎉 شروع دلقک بازی" },
    { command: "privacy", description: "🔒 حریم شخصی" },
    { command: "source", description: "🪄 سورس‌کد ربات" },
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

bot.start();
