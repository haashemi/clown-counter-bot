import { Command, CommandGroup } from "@grammyjs/commands";

import type { Handler } from "@/handlers/index";
import type { BotContext } from "@/lib/bot";

import { mediaHandlers } from "@/handlers/admin/media";
import { privacyHandler } from "@/handlers/static/privacy";
import { sourceHandler } from "@/handlers/static/source";
import { startHandler } from "@/handlers/static/start";

function toCommands(handler: Handler): Command<BotContext>[] {
  if (handler.kind !== "command") return [];

  const command = new Command<BotContext>(handler.name, handler.description);
  for (const scope of handler.scopes) command.addToScope(scope, handler.handler);

  return [command];
}

export const commands = new CommandGroup<BotContext>().add(
  [
    // Static
    startHandler,
    sourceHandler,
    privacyHandler,

    // Magic
    // cmdClown,
    // cmdUnclown,

    // Public
    // cmdClownOfTheDay,
    // cmdStats,

    // Admin
    // cmdResetStats,
    // cmdSetCooldown,

    // Admin
    ...mediaHandlers,
  ].flatMap(toCommands),
);
