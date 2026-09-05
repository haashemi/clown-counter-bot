import type { BotError } from "grammy";

import { GrammyError, HttpError } from "grammy";

import type { BotContext } from ".";

export function errorHandler(err: BotError<BotContext>) {
  const logErr = console.error;

  logErr(`Error while handling update ${err.ctx.update.update_id}:`);

  const e = err.error;

  if (e instanceof GrammyError) {
    logErr("Error in request:", e.description);
  } else if (e instanceof HttpError) {
    logErr("Could not contact Telegram:", e);
  } else {
    logErr("Unknown error:", e);
  }
}
