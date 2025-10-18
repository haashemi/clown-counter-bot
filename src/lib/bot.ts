import type { I18nFlavor } from "@grammyjs/i18n";
import type { Context, ErrorHandler } from "grammy";

import { autoRetry } from "@grammyjs/auto-retry";
import { I18n } from "@grammyjs/i18n";
import { Bot as GrammyBot, GrammyError, HttpError } from "grammy";

export type BotContext = Context & I18nFlavor;

export class Bot extends GrammyBot<BotContext> {
  constructor(token: string) {
    super(token);

    const i18n = new I18n<BotContext>({ defaultLocale: "fa", directory: "locales" });

    this.use(i18n);

    this.api.config.use(autoRetry());
  }

  override errorHandler: ErrorHandler = (err) => {
    // eslint-disable-next-line no-console
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
  };
}
