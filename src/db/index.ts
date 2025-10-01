import { createClient } from "@libsql/client/node";
import { drizzle } from "drizzle-orm/libsql";

import { config } from "@/config";

import * as schema from "./schema";

export const db = drizzle({
  client: createClient({ url: config.dbFilePath }),
  casing: "snake_case",
  schema,
});

export * from "./schema";
