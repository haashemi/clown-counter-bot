import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { callbackQuery, createTestBot, groupMessage, message, user } from "@/test/bot";
import { testDb, resetDb } from "@/test/db";
import { encodeFileId } from "@/test/file-id";

// PGlite and node-postgres drizzle instances share the query API but not a nominal type.
vi.mock(import("@/db/client"), async () => ({ db: (await import("@/test/db")).testDb as never }));

const admin = user(10, "Admin");
const member = user(11, "Member");

const group = async () => (await testDb.query.groups.findFirst()) ?? null;

describe("admin commands", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("stores /setcooldown for admins", async () => {
    const t = createTestBot({ admins: [admin.id] });
    await t.send(groupMessage({ from: admin, text: "/setcooldown 5" }));

    expect((await group())?.cooldown).toBe(300000);
  });

  it("ignores /setcooldown from non-admins", async () => {
    const t = createTestBot({ admins: [admin.id] });
    await t.send(groupMessage({ from: member, text: "/setcooldown 5" }));

    await expect(group()).resolves.toBeNull();
    expect(t.replies()).toHaveLength(0);
  });

  it.each([
    ["۱۰", 600000],
    ["٥", 300000],
  ])("accepts /setcooldown %s in Persian/Arabic digits", async (arg, expected) => {
    const t = createTestBot({ admins: [admin.id] });
    await t.send(groupMessage({ from: admin, text: `/setcooldown ${arg}` }));

    expect((await group())?.cooldown).toBe(expected);
  });

  it.each(["1e1", "0x10", "2.5"])("rejects /setcooldown %s", async (arg) => {
    const t = createTestBot({ admins: [admin.id] });
    await t.send(groupMessage({ from: admin, text: `/setcooldown ${arg}` }));

    await expect(group()).resolves.toBeNull();
    expect(t.replies()).toHaveLength(1);
  });

  it("rejects an out-of-range cooldown", async () => {
    const t = createTestBot({ admins: [admin.id] });
    await t.send(groupMessage({ from: admin, text: "/setcooldown 61" }));

    await expect(group()).resolves.toBeNull();
    expect(t.replies()).toHaveLength(1);
  });

  it("resets stats only when an admin confirms", async () => {
    const t = createTestBot({ admins: [admin.id] });
    await t.send(groupMessage({ from: admin, text: "/resetstats" }));

    const prompt = t.calls.find((c) => c.method === "sendMessage");
    expect(prompt?.payload["reply_markup"]).toBeDefined();

    const botMessage = message({ from: { id: 999, is_bot: true, first_name: "ClownCounter" }, text: "?" });

    await t.send(callbackQuery({ from: member, data: "resetstats:yes", message: botMessage }));
    const answer = t.calls.find((c) => c.method === "answerCallbackQuery");
    expect(answer?.payload["show_alert"]).toBe(true);
    await expect(group()).resolves.toBeNull();

    await t.send(callbackQuery({ from: admin, data: "resetstats:yes", message: botMessage }));
    expect((await group())?.resetAt).not.toBeNull();
  });

  it("stores a gif with /setgif", async () => {
    const t = createTestBot({ admins: [admin.id] });
    const fileId = encodeFileId({ typeId: 10, id: 42n, fileReference: Buffer.from("ref") });
    const animation = { file_id: fileId, file_unique_id: "u", width: 1, height: 1, duration: 1 };

    await t.send(groupMessage({ from: admin, text: "/setgif", replyTo: message({ from: member, animation }) }));

    expect((await group())?.gifIds).toHaveLength(1);
  });
});
