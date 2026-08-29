import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { join } from "node:path";
import { Pool } from "pg";

import { config } from "@/lib/config";
import { findAvailablePath } from "@/lib/utils";

import * as schema from "./schema";

const pool = new Pool({ connectionString: config.DATABASE_URL, max: 5 });

const db = drizzle({ client: pool, casing: "snake_case", schema });

async function runMigrations(): Promise<void> {
  const migrationsFolder = await findAvailablePath([
    join(import.meta.dirname, "drizzle"),
    join(process.cwd(), "drizzle"),
  ]);
  if (!migrationsFolder) throw new Error(`migrations folder not found.`);

  await migrate(db, { migrationsFolder });
}

export { db, runMigrations, schema };
