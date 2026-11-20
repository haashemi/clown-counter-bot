import type { BotCommandScope } from "grammy/types";

import type { BotContext } from "@/lib/bot";

import { resetStatsCallbacks, resetStatsHandler } from "./admin/resetstats";
import { setCooldownHandler } from "./admin/setcooldown";
import { triggerCallbacks, triggerHandlers } from "./admin/triggers";
import { clownHandlers } from "./group/clown";
import { clownOfTheDayHandler } from "./group/clownoftheday";
import { migrateHandler } from "./group/migrate";
import { statsHandler } from "./group/stats";
import { staticHandlers } from "./static";

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
  /** Optional predicate; when it returns false the update falls through to later handlers. */
  filter?: (ctx: BotContext) => Promise<boolean> | boolean;
  handler: HandlerFn;
}

export interface CallbackQueryHandler {
  kind: "callback_query";
  /** Exact callback data, or a pattern (its match is on `ctx.match`). */
  data: RegExp | string;
  handler: HandlerFn;
}

export const handlers: Handler[] = [
  // Private chats
  ...staticHandlers,

  // Groups
  ...clownHandlers,
  statsHandler,
  clownOfTheDayHandler,
  migrateHandler,

  // Admins
  ...triggerHandlers,
  ...triggerCallbacks,
  resetStatsHandler,
  ...resetStatsCallbacks,
  setCooldownHandler,
];
