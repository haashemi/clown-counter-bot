import { migrate } from "drizzle-orm/libsql/migrator";
import { stat } from "node:fs/promises";
import { join } from "node:path";

import { db } from "@/db";

async function resolveMigrationsFolder(): Promise<string> {
  const candidates = [join(import.meta.dirname, "drizzle")]; //, join(process.cwd(), "drizzle")];

  for await (const path of candidates) {
    try {
      await stat(path);
      return path;
    } catch {
      // try next candidate
    }
  }

  throw new Error(`Migrations folder not found (tried: ${candidates.join(", ")})`);
}

export async function runMigrations(): Promise<void> {
  await migrate(db, { migrationsFolder: await resolveMigrationsFolder() });
}
