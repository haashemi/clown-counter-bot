import type { BotCommandScope } from "grammy/types";

import type { BotContext } from "@/lib/bot";

export interface Handler<T = object> {
  command?: { name: string; description: string; scope: BotCommandScope };
  handler: (ctx: BotContext & T) => Promise<unknown>;
}
