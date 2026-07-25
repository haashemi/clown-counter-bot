import { Command } from "@grammyjs/commands";

import type { BotContext } from "@/lib/bot";

import { clownHandler } from "./handler";

export * from "./handler";
export * from "./middlewares";

export const cmdClown = new Command<BotContext>("clown", "🤡 عه یه دلقک!") //
  .addToScope({ type: "all_group_chats" }, clownHandler)
  .addToScope({ type: "all_chat_administrators" }, clownHandler);
