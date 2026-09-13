import type { MiddlewareFn } from "grammy";
import type { BotCommandScope } from "grammy/types";

import type { BotContext } from "@/lib/bot";

/** Everything the bot must know to bind a handler to itself. */
export type Handler = CommandHandler | MessageHandler | CallbackQueryHandler;

export type HandlerFn = (ctx: BotContext) => Promise<unknown>;

export interface CommandHandler {
  kind: "command";
  /** Command name without the leading `/`: `^[a-z0-9_]{1,32}$` (Telegram rejects anything else). */
  name: string;
  description: string;
  /** Non-empty. Where Telegram shows the command *and* where grammY is allowed to run it. */
  scopes: BotCommandScope[];
  handler: HandlerFn;
}

export interface MessageHandler {
  kind: "message";
  /** Restrict the handler to group/supergroup chats. */
  inGroup?: boolean;
  /** Optional matcher that runs before `handler`; it must call `next()` for `handler` to run. */
  filter?: MiddlewareFn<BotContext>;
  handler: HandlerFn;
}

export interface CallbackQueryHandler {
  kind: "callback_query";
  /** Exact `callback_data` value, e.g. `"resetstats:yes"`. */
  data: string;
  handler: HandlerFn;
}
