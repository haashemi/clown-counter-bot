import { defineConfig } from "drizzle-kit";
import { env } from "node:process";

export default defineConfig({
  dialect: "sqlite",
  out: "./drizzle",
  schema: "./src/db/schema/",
  strict: true,
  casing: "snake_case",
  dbCredentials: { url: env["DB_FILE_PATH"]! },
});
