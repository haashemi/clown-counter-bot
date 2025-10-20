import { Config } from "@fullstacksjs/config";
import { env } from "node:process";

const schema = new Config({
  /** Telegram Bot token */
  botToken: Config.string().required(),

  /** Database (SQLite) file path */
  dbFilePath: Config.string({ default: "file:database.sqlite" }),
});

export const config = schema
  .parse({
    botToken: env.BOT_TOKEN,
    dbFilePath: env.DB_FILE_PATH,
  })
  .getAll();
