import { Bot, GrammyError, HttpError } from "grammy";

import { config } from "@/config";
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

bot.catch((err) => {
  // eslint-disable-next-line no-console
  const logErr = console.error;

  logErr(`Error while handling update ${err.ctx.update.update_id}:`);

  const e = err.error;
  if (e instanceof GrammyError) {
    logErr("Error in request:", e.description);
  } else if (e instanceof HttpError) {
    logErr("Could not contact Telegram:", e);
  } else {
    logErr("Unknown error:", e);
  }
});

bot.start();
