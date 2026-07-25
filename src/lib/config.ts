import { createEnv } from "@t3-oss/env-core";
import { env } from "node:process";
import * as z from "zod";

export const config = createEnv({
  server: {
    /** Telegram Bot token */
    BOT_TOKEN: z
      .string()
      .length(46)
      .regex(/^\d{10}:.+/),
    BOT_SUPERUSER: z.coerce.number(),
    /** Database (SQLite) file path */
    DB_FILE_PATH: z.string().startsWith("file:"),
  },

  runtimeEnv: env,
  emptyStringAsUndefined: true,
});
