import { CommandGroup } from "@grammyjs/commands";

import type { BotContext } from "@/lib/bot";

import { cmdClown } from "./clown";
import { cmdStats } from "./public/stats";
import { cmdPrivacy } from "./static/privacy";
import { cmdSource } from "./static/source";
import { cmdStart } from "./static/start";

export const commands = new CommandGroup<BotContext>().add([
  // Magic
  cmdClown,

  // Static
  cmdStart,
  cmdSource,
  cmdPrivacy,

  // Public
  cmdStats,
]);
