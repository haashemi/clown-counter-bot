import { Command, CommandGroup } from "@grammyjs/commands";

import type { BotContext } from "@/lib/bot";

import { mediaHandlers } from "@/handlers/admin/media";
import { privacyHandler } from "@/handlers/static/privacy";
import { sourceHandler } from "@/handlers/static/source";
import { startHandler } from "@/handlers/static/start";

import { cmdResetStats } from "./admin/resetstats";
import { cmdSetCooldown } from "./admin/setcooldown";
import { cmdClown, cmdUnclown } from "./clown";
import { cmdClownOfTheDay } from "./public/clownoftheday";
import { cmdStats } from "./public/stats";

const staticCommands: Command<BotContext>[] = [startHandler, sourceHandler, privacyHandler]
  .filter((h) => !!h.command)
  .map((h) => new Command<BotContext>(h.command!.name, h.command!.description).addToScope(h.command!.scope, h.handler));

const adminCommands: Command<BotContext>[] = [...mediaHandlers]
  .filter((h) => !!h.command)
  .map((h) => new Command<BotContext>(h.command!.name, h.command!.description).addToScope(h.command!.scope, h.handler));

export const commands = new CommandGroup<BotContext>().add([
  ...staticCommands,

  // Magic
  cmdClown,
  cmdUnclown,

  // Public
  cmdClownOfTheDay,
  cmdStats,

  // Admin
  cmdResetStats,
  cmdSetCooldown,
  ...adminCommands,
]);
