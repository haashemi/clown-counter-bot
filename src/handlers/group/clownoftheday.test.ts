import { isNull } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { schema } from "@/db";
import { createTestBot, groupMessage, user } from "@/test/bot";
import { testDb, resetDb } from "@/test/db";

// PGlite and node-postgres drizzle instances share the query API but not a nominal type.
vi.mock(import("@/db/client"), async () => ({ db: (await import("@/test/db")).testDb as never }));

const CHAT_ID = -100123;
const alice = user(1, "Alice");

const systemVotes = () => testDb.select().from(schema.clownVotes).where(isNull(schema.clownVotes.voterId));

describe("/clownoftheday", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("replies without picking when the group has no votes", async () => {
    const t = createTestBot();
    await t.send(groupMessage({ from: alice, text: "/clownoftheday" }));

    expect(t.replies()).toHaveLength(1);
    await expect(testDb.select().from(schema.clownVotes)).resolves.toHaveLength(0);
  });

  it("adds one system vote per day", async () => {
    await testDb.insert(schema.users).values([
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ]);
    await testDb.insert(schema.groups).values({ id: CHAT_ID, name: "Test Group" });
    await testDb.insert(schema.clownVotes).values({ groupId: CHAT_ID, voterId: 1, clownId: 2 });

    const t = createTestBot();
    await t.send(groupMessage({ from: alice, text: "/clownoftheday" }));

    const rows = await systemVotes();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.clownId).toBe(2);
    expect(rows[0]!.quantity).toBeGreaterThanOrEqual(5);
    expect(rows[0]!.quantity).toBeLessThanOrEqual(20);

    await t.send(groupMessage({ from: alice, text: "/clownoftheday" }));
    await expect(systemVotes()).resolves.toHaveLength(1);
    expect(t.replies()).toHaveLength(2);
  });
});
