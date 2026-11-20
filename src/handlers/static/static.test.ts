import { describe, expect, it, vi } from "vite-plus/test";

import { createTestBot, groupMessage, user } from "@/test/bot";

// PGlite and node-postgres drizzle instances share the query API but not a nominal type.
vi.mock(import("@/db/client"), async () => ({ db: (await import("@/test/db")).testDb as never }));

const alice = user(1, "Alice");

describe("static commands", () => {
  it("sends the source link on /source", async () => {
    const t = createTestBot();
    await t.send(groupMessage({ chatId: alice.id, chatType: "private", from: alice, text: "/source" }));

    expect(t.replies()).toHaveLength(1);
    expect(t.replies()[0]).toContain("github.com/haashemi/clown-counter-bot");
  });
});
