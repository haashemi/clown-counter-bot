import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { join } from "node:path";

import * as schema from "@/db/schema";

export const testDb = drizzle({ client: new PGlite(), casing: "snake_case", schema });

await migrate(testDb, { migrationsFolder: join(process.cwd(), "drizzle") });

export async function resetDb(): Promise<void> {
  await testDb.execute(sql`TRUNCATE clown_votes, groups, users RESTART IDENTITY CASCADE`);
}
