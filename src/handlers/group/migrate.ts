import { eq } from "drizzle-orm";

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

    // Order matters for the clown_votes.group_id FK: insert new → repoint votes → delete old.
    const { id: _oldId, ...settings } = old;
    await tx
      .insert(schema.groups)
      .values({ ...settings, id: toId })
      .onConflictDoUpdate({ target: schema.groups.id, set: settings });
    await tx.update(schema.clownVotes).set({ groupId: toId }).where(eq(schema.clownVotes.groupId, fromId));
    await tx.delete(schema.groups).where(eq(schema.groups.id, fromId));
  });
}

export const migrateHandler: MessageHandler = {
  kind: "message",
  inGroup: true,
  filter: (ctx) => ctx.msg?.migrate_to_chat_id !== undefined,
  handler: migrateGroup,
};
