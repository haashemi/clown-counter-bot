import { env } from "node:process";
import z from "zod";

const configSchema = z.object({
  /** Telegram Bot token */
  botToken: z.string(),

  /** Database (SQLite) file path */
  dbFilePath: z.string(),
});

const configRaw: DeepPartial<z.input<typeof configSchema>> = {
  botToken: env.BOT_TOKEN,
  dbFilePath: env.DB_FILE_PATH,
};

export const config = configSchema.parse(configRaw);
