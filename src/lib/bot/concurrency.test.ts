import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { schema } from "@/db";
import { createTestBot, groupMessage, message, user } from "@/test/bot";
import { testDb, resetDb } from "@/test/db";

// PGlite and node-postgres drizzle instances share the query API but not a nominal type.
vi.mock(import("@/db/client"), async () => ({ db: (await import("@/test/db")).testDb as never }));

const CHAT_ID = -100123;
const alice = user(1, "Alice");
const bob = user(2, "Bob");

describe("per-chat sequential updates", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("records only one of two concurrent 🤡 votes within the cooldown", async () => {
    const t = createTestBot();
    const vote = () => groupMessage({ from: alice, text: "🤡", replyTo: message({ from: bob, text: "hi" }) });

    await Promise.all([t.send(vote()), t.send(vote())]);

    await expect(testDb.select().from(schema.clownVotes)).resolves.toHaveLength(1);
  });

  it("picks only one clown of the day for concurrent /clownoftheday", async () => {
    await testDb.insert(schema.users).values([
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ]);
    await testDb.insert(schema.groups).values({ id: CHAT_ID, name: "Test Group" });
    await testDb.insert(schema.clownVotes).values({ groupId: CHAT_ID, voterId: 1, clownId: 2 });

    const t = createTestBot();
    const cmd = () => groupMessage({ from: alice, text: "/clownoftheday" });
    await Promise.all([t.send(cmd()), t.send(cmd())]);

    const rows = await testDb.select().from(schema.clownVotes);
    expect(rows.filter((r) => r.voterId === null)).toHaveLength(1);
  });
});
