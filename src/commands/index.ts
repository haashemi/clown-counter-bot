import { CommandGroup } from "@grammyjs/commands";

import type { BotContext } from "@/lib/bot";

import { cmdClown } from "./clown";
import { cmdPrivacy } from "./privacy";
import { cmdSource } from "./source";
import { cmdStart } from "./start";
import { cmdStats } from "./stats";

export const commands = new CommandGroup<BotContext>().add([
  //
  cmdStart,
  cmdClown,
  cmdStats,
  cmdSource,
  cmdPrivacy,
]);
