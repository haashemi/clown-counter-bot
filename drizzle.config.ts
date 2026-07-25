import { defineConfig } from "drizzle-kit";
import { env } from "node:process";

export default defineConfig({
  dialect: "sqlite",
  out: "./drizzle",
  schema: "./src/db/schema/",
  strict: true,
  casing: "snake_case",
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  dbCredentials: { url: env.DB_FILE_PATH! },
});
