import type { MiddlewareFn } from "grammy";
import type { BotCommandScope } from "grammy/types";

import type { BotContext } from "@/lib/bot";

import { mediaHandlers } from "./admin/media";
import { resetStatsCallbacks, resetStatsHandler } from "./admin/resetstats";
import { setCooldownHandler } from "./admin/setcooldown";
import { clownHandlers } from "./group/clown";
import { clownOfTheDayHandler } from "./group/clownoftheday";
import { statsHandler } from "./group/stats";
import { privacyHandler } from "./static/privacy";
import { sourceHandler } from "./static/source";
import { startHandler } from "./static/start";

/** Everything the bot must know to bind a handler to itself. */
export type Handler = CallbackQueryHandler | CommandHandler | MessageHandler;

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

/** Everything `bot.registerHandlers(...handlers)` binds. Add new features here. */
export const handlers: Handler[] = [
  // Private chats
  startHandler,
  sourceHandler,
  privacyHandler,

  // Groups
  ...clownHandlers,
  statsHandler,
  clownOfTheDayHandler,

  // Admins
  ...mediaHandlers,
  resetStatsHandler,
  ...resetStatsCallbacks,
  setCooldownHandler,
];
