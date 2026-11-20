import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { schema } from "@/db";
import { createTestBot, groupMessage, user } from "@/test/bot";
import { testDb, resetDb } from "@/test/db";

// PGlite and node-postgres drizzle instances share the query API but not a nominal type.
vi.mock(import("@/db/client"), async () => ({ db: (await import("@/test/db")).testDb as never }));

const CHAT_ID = -100123;
const alice = user(1, "Alice");

async function seed(resetAt: Date | null = null) {
  await testDb.insert(schema.users).values([
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" },
    { id: 3, name: "Carol" },
  ]);
  await testDb.insert(schema.groups).values({ id: CHAT_ID, name: "Test Group", resetAt });
}

describe("/stats", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("replies when there are no votes", async () => {
    const t = createTestBot();
    await t.send(groupMessage({ from: alice, text: "/stats" }));

    expect(t.replies()).toHaveLength(1);
    await expect(testDb.select().from(schema.clownVotes)).resolves.toHaveLength(0);
  });

  it("lists clowns by vote count", async () => {
    await seed();
    await testDb.insert(schema.clownVotes).values([
      { groupId: CHAT_ID, voterId: 1, clownId: 3 },
      { groupId: CHAT_ID, voterId: 1, clownId: 2 },
      { groupId: CHAT_ID, voterId: 3, clownId: 2 },
    ]);

    const t = createTestBot();
    await t.send(groupMessage({ from: alice, text: "/stats" }));

    const [reply] = t.replies();
    expect(reply).toContain("Bob");
    expect(reply).toContain("Carol");
    expect(reply!.indexOf("Bob")).toBeLessThan(reply!.indexOf("Carol"));
  });

  it("excludes votes before resetAt", async () => {
    const now = new Date();
    await seed(now);
    await testDb.insert(schema.clownVotes).values([
      { groupId: CHAT_ID, voterId: 1, clownId: 2, votedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      { groupId: CHAT_ID, voterId: 1, clownId: 3, votedAt: new Date(now.getTime() + 1000) },
    ]);

    const t = createTestBot();
    await t.send(groupMessage({ from: alice, text: "/stats" }));

    const [reply] = t.replies();
    expect(reply).toContain("Carol");
    expect(reply).not.toContain("Bob");
  });

  it("lists at most 30 clowns", async () => {
    const users = Array.from({ length: 35 }, (_, i) => ({ id: 100 + i, name: `User${i}` }));
    await testDb.insert(schema.users).values(users);
    await testDb.insert(schema.groups).values({ id: CHAT_ID, name: "Test Group" });
    await testDb
      .insert(schema.clownVotes)
      .values(users.map((u) => ({ groupId: CHAT_ID, voterId: null, clownId: u.id })));

    const t = createTestBot();
    await t.send(groupMessage({ from: alice, text: "/stats" }));

    const [reply] = t.replies();
    expect(reply!.split("\n").filter((line) => /User\d+/.test(line))).toHaveLength(30);
  });
});
