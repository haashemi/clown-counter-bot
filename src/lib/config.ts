import { join } from "node:path";
import { env, loadEnvFile } from "node:process";

import { findAvailablePath } from "./utils";

export interface Config {
  /** Telegram Bot token */
  BOT_TOKEN: string;
  /** Database (SQLite) file path */
  DB_FILE_PATH: string;
}

async function loadEnv(): Promise<void> {
  const path = await findAvailablePath([join(import.meta.dirname, ".env"), ".env"]);
  if (path) loadEnvFile(path);
}

async function loadConfig(): Promise<Config> {
  await loadEnv();

  const config: Config = {
    BOT_TOKEN: env["BOT_TOKEN"] ?? "",
    DB_FILE_PATH: env["DB_FILE_PATH"] ?? "",
  };

  if (!config.BOT_TOKEN || config.BOT_TOKEN.length !== 46 || !/^\d{10}:.+/.test(config.BOT_TOKEN)) {
    throw new Error("Invalid BOT_TOKEN: expected 46 chars matching /^\\d{10}:.+/");
  }

  if (!config.DB_FILE_PATH || !config.DB_FILE_PATH.startsWith("file:")) {
    throw new Error("Invalid DB_FILE_PATH: must start with 'file:'");
  }

  return config;
}

export const config = await loadConfig();
