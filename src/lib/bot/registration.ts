import type { CommandGroup } from "@grammyjs/commands";
import type { Bot as GrammyBot, MiddlewareFn } from "grammy";

import { Command } from "@grammyjs/commands";

import type { Handler, MessageHandler } from "@/handlers";

import type { BotContext } from ".";

import { isInGroup } from "./filters";

/** Middlewares a single `MessageHandler` registers, in execution order. */
function messageChain(handler: MessageHandler): MiddlewareFn<BotContext>[] {
  const chain: MiddlewareFn<BotContext>[] = [];

  if (handler.inGroup) chain.push(isInGroup);
  if (handler.filter) chain.push(handler.filter);
  chain.push(handler.handler);

  return chain;
}

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

      case "message":
        bot.on("message", ...messageChain(handler));
        break;

      case "callback_query":
        bot.callbackQuery(handler.data, handler.handler);
        break;
    }
  }
}
