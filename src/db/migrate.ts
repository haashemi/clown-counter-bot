import { migrate } from "drizzle-orm/libsql/migrator";
import { join } from "node:path";

import { db } from "@/db";
import { findAvailablePath } from "@/lib/utils";

async function getMigrationFolder(): Promise<string> {
  const availablePath = await findAvailablePath([
    join(import.meta.dirname, "drizzle"),
    join(process.cwd(), "drizzle"), //
  ]);
  if (availablePath) return availablePath;

  throw new Error(`Migrations folder not found.`);
}

export async function runMigrations(): Promise<void> {
  await migrate(db, { migrationsFolder: await getMigrationFolder() });
}
