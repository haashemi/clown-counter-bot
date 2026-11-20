import { migrate } from "drizzle-orm/node-postgres/migrator";
import { join } from "node:path";

import { findAvailablePath } from "@/lib/utils";

import { closeDb, db } from "./client";
import * as schema from "./schema";

async function runMigrations(): Promise<void> {
  const migrationsFolder = await findAvailablePath([
    join(import.meta.dirname, "drizzle"),
    join(process.cwd(), "drizzle"),
  ]);
  if (!migrationsFolder) throw new Error(`migrations folder not found.`);

  await migrate(db, { migrationsFolder });
}

type GroupPatch = Partial<Omit<typeof schema.groups.$inferInsert, "id" | "name">>;

async function saveGroup(chatId: number, name: string | undefined, patch: GroupPatch = {}): Promise<void> {
  const set = name === undefined ? patch : { ...patch, name };
  const insert = db.insert(schema.groups).values({ id: chatId, name, ...patch });

  await (Object.keys(set).length === 0
    ? insert.onConflictDoNothing()
    : insert.onConflictDoUpdate({ target: schema.groups.id, set }));
}

export type { GroupPatch };
export { closeDb, db, runMigrations, saveGroup, schema };
