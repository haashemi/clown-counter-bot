import { defineConfig } from "drizzle-kit";
import { env } from "node:process";

export default defineConfig({
  dialect: "postgresql",
  out: "./drizzle",
  schema: "./src/db/schema/",
  strict: true,
  casing: "snake_case",
  dbCredentials: { url: env["DATABASE_URL"]! },
});
