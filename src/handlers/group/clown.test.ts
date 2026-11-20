import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { schema } from "@/db";
import { mediaKey } from "@/lib/media-key";
import { createTestBot, groupMessage, ME, message, user } from "@/test/bot";
import { testDb, resetDb } from "@/test/db";
import { encodeFileId } from "@/test/file-id";

// PGlite and node-postgres drizzle instances share the query API but not a nominal type.
vi.mock(import("@/db/client"), async () => ({ db: (await import("@/test/db")).testDb as never }));

const CHAT_ID = -100123;
const alice = user(1, "Alice");
const bob = user(2, "Bob");

const votes = () => testDb.select().from(schema.clownVotes);

describe("clown voting", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("records a 🤡 reply as a +1 vote", async () => {
    const t = createTestBot();
    await t.send(groupMessage({ from: alice, text: "🤡", replyTo: message({ from: bob, text: "hi" }) }));

    const rows = await votes();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ quantity: 1, voterId: alice.id, clownId: bob.id, groupId: CHAT_ID });
    expect(t.replies()).toHaveLength(1);
    expect(t.replies()[0]).toContain("Bob");
    expect(t.replies()[0]).toContain("Alice");
  });

  it("records /clown as a reply", async () => {
    const t = createTestBot();
    await t.send(groupMessage({ from: alice, text: "/clown", replyTo: message({ from: bob, text: "hi" }) }));

    const rows = await votes();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ quantity: 1, voterId: alice.id, clownId: bob.id });
  });

  it("records a 😇 reply as a -1 vote", async () => {
    const t = createTestBot();
    await t.send(groupMessage({ from: alice, text: "😇", replyTo: message({ from: bob, text: "hi" }) }));

    const rows = await votes();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ quantity: -1 });
  });

  it("rejects a second vote within the cooldown", async () => {
    const t = createTestBot();
    await t.send(groupMessage({ from: alice, text: "🤡", replyTo: message({ from: bob, text: "hi" }) }));
    await t.send(groupMessage({ from: alice, text: "🤡", replyTo: message({ from: bob, text: "hi" }) }));

    await expect(votes()).resolves.toHaveLength(1);
    const [first, second] = t.replies();
    expect(second).toBeDefined();
    expect(second).not.toBe(first);
  });

  it("allows repeated votes with a zero cooldown", async () => {
    await testDb.insert(schema.groups).values({ id: CHAT_ID, name: "Test Group", cooldown: 0 });
    const t = createTestBot();
    await t.send(groupMessage({ from: alice, text: "🤡", replyTo: message({ from: bob, text: "hi" }) }));
    await t.send(groupMessage({ from: alice, text: "🤡", replyTo: message({ from: bob, text: "hi" }) }));

    await expect(votes()).resolves.toHaveLength(2);
  });

  it("rejects voting for yourself", async () => {
    const t = createTestBot();
    await t.send(groupMessage({ from: alice, text: "🤡", replyTo: message({ from: alice, text: "hi" }) }));

    await expect(votes()).resolves.toHaveLength(0);
    expect(t.replies()).toHaveLength(1);
  });

  it("rejects voting for a bot", async () => {
    const t = createTestBot();
    const otherBot = { ...user(3, "OtherBot"), is_bot: true };
    await t.send(groupMessage({ from: alice, text: "🤡", replyTo: message({ from: otherBot, text: "hi" }) }));

    await expect(votes()).resolves.toHaveLength(0);
  });

  it("rejects voting for this bot", async () => {
    const t = createTestBot();
    await t.send(groupMessage({ from: alice, text: "🤡", replyTo: message({ from: ME, text: "hi" }) }));

    await expect(votes()).resolves.toHaveLength(0);
  });

  it("ignores 🤡 without a reply", async () => {
    const t = createTestBot();
    await t.send(groupMessage({ from: alice, text: "🤡" }));

    await expect(votes()).resolves.toHaveLength(0);
    expect(t.replies()).toHaveLength(0);
  });

  it("ignores 🤡 that only replies to a forum topic's creation message", async () => {
    const t = createTestBot();
    const topic = { ...message({ from: bob }), forum_topic_created: { name: "t", icon_color: 0 } };
    await t.send(groupMessage({ from: alice, text: "🤡", replyTo: topic }));

    await expect(votes()).resolves.toHaveLength(0);
    expect(t.replies()).toHaveLength(0);
  });

  it("ignores unrelated text replies", async () => {
    const t = createTestBot();
    await t.send(groupMessage({ from: alice, text: "hello", replyTo: message({ from: bob, text: "hi" }) }));

    await expect(votes()).resolves.toHaveLength(0);
    expect(t.calls.filter((c) => c.method === "sendMessage")).toHaveLength(0);
  });

  it("ignores private chats", async () => {
    const t = createTestBot();
    const opts = { chatId: alice.id, chatType: "private" as const };
    await t.send(groupMessage({ ...opts, from: alice, text: "🤡", replyTo: message({ ...opts, from: bob }) }));

    await expect(votes()).resolves.toHaveLength(0);
    expect(t.replies()).toHaveLength(0);
  });

  it("records a configured gif as a vote", async () => {
    const fileId = encodeFileId({ typeId: 10, id: 42n, fileReference: Buffer.from("ref") });
    await testDb.insert(schema.groups).values({ id: CHAT_ID, name: "Test Group" });
    await testDb
      .insert(schema.groupTriggers)
      .values({ groupId: CHAT_ID, key: mediaKey(fileId), media: "animation", action: "clown" });

    const t = createTestBot();
    const animation = { file_id: fileId, file_unique_id: "u", width: 1, height: 1, duration: 1 };
    await t.send(groupMessage({ from: alice, animation, replyTo: message({ from: bob, text: "hi" }) }));

    await expect(votes()).resolves.toHaveLength(1);
    // A legacy row without a file_id picks it up from the first match.
    await expect(testDb.select().from(schema.groupTriggers)).resolves.toMatchObject([{ fileId }]);
  });
});
