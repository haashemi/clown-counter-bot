import { and, eq, notExists } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { MessageHandler } from "@/handlers";
import type { BotContext } from "@/lib/bot";

import { db, schema } from "@/db";

/** Basic group → supergroup: Telegram assigns a new chat id; move the group's settings and votes to it. */
async function migrateGroup(ctx: BotContext) {
  const fromId = ctx.chat?.id;
  const toId = ctx.msg?.migrate_to_chat_id;
  if (fromId === undefined || toId === undefined) return;

  await db.transaction(async (tx) => {
    const old = await tx.query.groups.findFirst({ where: (f, o) => o.eq(f.id, fromId) });
    if (!old) return; // never used, or already migrated

    // Order matters for the group_id FKs: insert new → repoint votes and triggers → delete old.
    const { id: _oldId, ...settings } = old;
    await tx
      .insert(schema.groups)
      .values({ ...settings, id: toId })
      .onConflictDoUpdate({ target: schema.groups.id, set: settings });
    await tx.update(schema.clownVotes).set({ groupId: toId }).where(eq(schema.clownVotes.groupId, fromId));
    // Keys the new chat already has stay as they are; the old copies go with the old group (ON DELETE CASCADE).
    const { groupTriggers } = schema;
    const existing = alias(groupTriggers, "existing");
    await tx
      .update(groupTriggers)
      .set({ groupId: toId })
      .where(
        and(
          eq(groupTriggers.groupId, fromId),
          notExists(
            tx
              .select()
              .from(existing)
              .where(and(eq(existing.groupId, toId), eq(existing.key, groupTriggers.key))),
          ),
        ),
      );
    await tx.delete(schema.groups).where(eq(schema.groups.id, fromId));
  });
}

export const migrateHandler: MessageHandler = {
  kind: "message",
  inGroup: true,
  filter: (ctx) => ctx.msg?.migrate_to_chat_id !== undefined,
  handler: migrateGroup,
};
