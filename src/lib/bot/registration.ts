import type { CommandGroup } from "@grammyjs/commands";
import type { Bot as GrammyBot } from "grammy";

import { Command } from "@grammyjs/commands";

import type { Handler } from "@/handlers";

import type { BotContext } from ".";

/** Binds every handler to `bot`; command handlers go into the single, shared `commands` group. */
export function applyHandlers(
  bot: GrammyBot<BotContext>,
  commands: CommandGroup<BotContext>,
  handlers: Handler[],
): void {
  for (const handler of handlers) {
    switch (handler.kind) {
      case "command": {
        const command = new Command<BotContext>(handler.name, handler.description);
        for (const scope of handler.scopes) command.addToScope(scope, handler.handler);
        commands.add(command);
        break;
      }

      case "message": {
        // `chatType` and `filter` call `next()` on mismatch, so later handlers still see the update.
        const matches = handler.filter ?? (() => true);
        const messages = bot.on("message");
        if (handler.inGroup) messages.chatType(["group", "supergroup"]).filter(matches, handler.handler);
        else messages.filter(matches, handler.handler);
        break;
      }

      case "callback_query":
        bot.callbackQuery(handler.data, handler.handler);
        break;
    }
  }
}
