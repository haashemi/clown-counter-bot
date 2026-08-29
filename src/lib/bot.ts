import type { I18nFlavor } from "@grammyjs/i18n";
import type { Context, ErrorHandler } from "grammy";

import { autoRetry } from "@grammyjs/auto-retry";
import { I18n } from "@grammyjs/i18n";
import { Bot as GrammyBot, GrammyError, HttpError } from "grammy";
import { join } from "node:path";

import { findAvailablePath } from "./utils";

export type BotContext = Context & I18nFlavor;

export async function getLocalesDirectory(): Promise<string> {
  const availablePath = await findAvailablePath([
    join(import.meta.dirname, "locales"),
    join(process.cwd(), "locales"), //
  ]);
  if (availablePath) return availablePath;

  throw new Error(`Locales directory not found.`);
}

export class Bot extends GrammyBot<BotContext> {
  constructor(token: string, localesDirectory: string) {
    super(token);

    const i18n = new I18n<BotContext>({ defaultLocale: "fa", directory: localesDirectory });

    this.use(i18n);

    this.api.config.use(autoRetry());
  }

  override errorHandler: ErrorHandler = (err) => {
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
