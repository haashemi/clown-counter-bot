import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import type { Update } from "grammy/types";

import { schema } from "@/db";
import { createTestBot, groupMessage, user } from "@/test/bot";
import { testDb, resetDb } from "@/test/db";

// PGlite and node-postgres drizzle instances share the query API but not a nominal type.
vi.mock(import("@/db/client"), async () => ({ db: (await import("@/test/db")).testDb as never }));

const OLD_ID = -4001;
const NEW_ID = -1004001;
const alice = user(1, "Alice");
const bob = user(2, "Bob");

function migrationUpdate(chatId = OLD_ID): Update {
  const update = groupMessage({ chatId, chatType: "group", from: alice });
  return { ...update, message: { ...update.message!, migrate_to_chat_id: NEW_ID } };
}

async function seed() {
  await testDb.insert(schema.users).values([
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" },
  ]);
  await testDb.insert(schema.groups).values({ id: OLD_ID, name: "Old", cooldown: 0, resetAt: null });
  await testDb.insert(schema.groupTriggers).values({ groupId: OLD_ID, key: "7", media: "animation", action: "clown" });
  await testDb.insert(schema.clownVotes).values([
    { groupId: OLD_ID, voterId: 1, clownId: 2 },
    { groupId: OLD_ID, voterId: 1, clownId: 2 },
  ]);
}

describe("group → supergroup migration", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("moves settings and votes to the new chat id", async () => {
    await seed();
    const t = createTestBot();
    await t.send(migrationUpdate());

    const groups = await testDb.select().from(schema.groups);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ id: NEW_ID, cooldown: 0 });
    await expect(testDb.select().from(schema.groupTriggers)).resolves.toMatchObject([{ groupId: NEW_ID, key: "7" }]);

    const votes = await testDb.select().from(schema.clownVotes);
    expect(votes.map((v) => v.groupId)).toEqual([NEW_ID, NEW_ID]);
  });

  it("is idempotent and keeps /stats working in the supergroup", async () => {
    await seed();
    const t = createTestBot();
    await t.send(migrationUpdate());
    await t.send(migrationUpdate());

    await expect(testDb.select().from(schema.groups)).resolves.toHaveLength(1);
    await expect(testDb.select().from(schema.clownVotes)).resolves.toHaveLength(2);

    await t.send(groupMessage({ chatId: NEW_ID, chatType: "supergroup", from: bob, text: "/stats" }));
    expect(t.replies().at(-1)).toContain("Bob");
  });

  it("ignores a migration for an unknown group", async () => {
    const t = createTestBot();
    await t.send(migrationUpdate());

    await expect(testDb.select().from(schema.groups)).resolves.toHaveLength(0);
  });
});
