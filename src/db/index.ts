import { createClient } from "@libsql/client/node";
import { drizzle } from "drizzle-orm/libsql";

import { config } from "@/lib/config";

import * as schema from "./schema";

export const db = drizzle({
  client: createClient({ url: config.DB_FILE_PATH }),
  casing: "snake_case",
  schema,
});

export * as schema from "./schema";
