import { I18n } from "@grammyjs/i18n";
import { join } from "node:path";

import { findAvailablePath } from "@/lib/utils";

import type { BotContext } from "..";

export type { I18nFlavor } from "@grammyjs/i18n";

export function i18nMiddleware(localesDirectory: string) {
  return new I18n<BotContext>({ defaultLocale: "fa", directory: localesDirectory });
}

export async function getLocalesDirectory(): Promise<string> {
  const availablePath = await findAvailablePath([
    join(import.meta.dirname, "locales"),
    join(process.cwd(), "locales"), //
  ]);
  if (availablePath) return availablePath;

  throw new Error(`Locales directory not found.`);
}
