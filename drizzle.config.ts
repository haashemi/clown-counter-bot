import { defineConfig } from "drizzle-kit";

import { config } from "@/config";

export default defineConfig({
  dialect: "sqlite",
  out: "./drizzle",
  schema: "./src/db/schema/",
  strict: true,
  casing: "snake_case",
  dbCredentials: { url: config.dbFilePath },
});
