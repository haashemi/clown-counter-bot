import { env } from "node:process";

export interface Config {
  /** Telegram Bot token */
  BOT_TOKEN: string;
  /** Database (SQLite) file path */
  DB_FILE_PATH: string;
}

export function loadConfig(): Config {
  const botToken = env.BOT_TOKEN;

  if (!botToken || botToken.length !== 46 || !/^\d{10}:.+/.test(botToken)) {
    throw new Error("Invalid BOT_TOKEN: expected 46 chars matching /^\\d{10}:.+/");
  }

  const dbFilePath = env.DB_FILE_PATH;

  if (!dbFilePath || !dbFilePath.startsWith("file:")) {
    throw new Error("Invalid DB_FILE_PATH: must start with 'file:'");
  }

  return { BOT_TOKEN: botToken, DB_FILE_PATH: dbFilePath };
}

export const config = loadConfig();
