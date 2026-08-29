import { join } from "node:path";
import { env, loadEnvFile } from "node:process";

import { findAvailablePath } from "./utils";

export interface Config {
  /** Telegram Bot token */
  BOT_TOKEN: string;
  /** PostgreSQL connection string */
  DATABASE_URL: string;
}

async function loadEnv(): Promise<void> {
  const path = await findAvailablePath([join(import.meta.dirname, ".env"), ".env"]);
  if (path) loadEnvFile(path);
}

async function loadConfig(): Promise<Config> {
  await loadEnv();

  const config: Config = {
    BOT_TOKEN: env["BOT_TOKEN"] ?? "",
    DATABASE_URL: env["DATABASE_URL"] ?? "",
  };

  if (!config.BOT_TOKEN || config.BOT_TOKEN.length !== 46 || !/^\d{10}:.+/.test(config.BOT_TOKEN)) {
    throw new Error("Invalid BOT_TOKEN: expected 46 chars matching /^\\d{10}:.+/");
  }

  if (!config.DATABASE_URL || !/^postgres(?:ql)?:\/\/\S+/.test(config.DATABASE_URL)) {
    throw new Error("Invalid DATABASE_URL: expected a postgres:// or postgresql:// connection string");
  }

  return config;
}

export const config = await loadConfig();
