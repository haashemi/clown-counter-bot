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

type GroupPatch = Partial<Omit<typeof schema.groups.$inferInsert, "id" | "name">>;

async function saveGroup(chatId: number, name: string | undefined, patch: GroupPatch): Promise<void> {
  const values = { id: chatId, name, ...patch };

  await db.insert(schema.groups).values(values).onConflictDoUpdate({
    target: schema.groups.id,
    set: patch,
  });
}

export type { GroupPatch };
export { db, runMigrations, saveGroup, schema };
