import { stat } from "node:fs/promises";

import { db, schema } from "@/db";

export async function findAvailablePath(paths: string[]): Promise<string | null> {
  for await (const path of paths) {
    try {
      await stat(path);
      return path;
    } catch {
      // try next candidate
    }
  }

  return null;
}

export type GroupPatch = Partial<Omit<typeof schema.groups.$inferInsert, "id" | "name">>;

export async function saveGroup(chatId: number, name: string | undefined, patch: GroupPatch): Promise<void> {
  const values = { id: chatId, name, ...patch };

  await db.insert(schema.groups).values(values).onConflictDoUpdate({
    target: schema.groups.id,
    set: patch,
  });
}
