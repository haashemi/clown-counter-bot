import { CommandGroup } from "@grammyjs/commands";

import type { BotContext } from "@/lib/bot";

import { cmdClown } from "./clown";
import { cmdPrivacy } from "./static/privacy";
import { cmdSource } from "./static/source";
import { cmdStart } from "./static/start";
import { cmdStats } from "./stats";

export const commands = new CommandGroup<BotContext>().add([
  //
  cmdStart,
  cmdClown,
  cmdStats,
  cmdSource,
  cmdPrivacy,
]);
