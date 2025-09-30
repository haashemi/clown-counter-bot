import { env } from "node:process";
import z from "zod";

const configSchema = z.object({
  /** Telegram Bot token */
  botToken: z.string(),

  /** Database (SQLite) connection url */
  dbUrl: z.string(),
});

const configRaw: DeepPartial<z.input<typeof configSchema>> = {
  botToken: env.BOT_TOKEN,
  dbUrl: env.DB_URL,
};

export const config = configSchema.parse(configRaw);
