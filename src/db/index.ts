import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { config } from "@/lib/config";

import * as schema from "./schema";

const pool = new Pool({ connectionString: config.DATABASE_URL, max: 5 });

const db = drizzle({ client: pool, casing: "snake_case", schema });

export { db, schema };
export { runMigrations } from "./migrate";
