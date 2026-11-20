import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import type { Message } from "grammy/types";

import { schema } from "@/db";
import { callbackQuery, createTestBot, groupMessage, ME, message, user } from "@/test/bot";
import { testDb, resetDb } from "@/test/db";
import { encodeFileId } from "@/test/file-id";

// PGlite and node-postgres drizzle instances share the query API but not a nominal type.
vi.mock(import("@/db/client"), async () => ({ db: (await import("@/test/db")).testDb as never }));

const CHAT_ID = -100123;
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

  it("refreshes the group name on every write", async () => {
    const t = createTestBot({ admins: [admin.id] });
    await t.send(groupMessage({ from: admin, chatTitle: "Old", text: "/setcooldown 5" }));
    await t.send(groupMessage({ from: admin, chatTitle: "New", text: "/setcooldown 5" }));

    expect((await group())?.name).toBe("New");
  });

  const gif = (id: bigint) => ({
    file_id: encodeFileId({ typeId: 10, id, fileReference: Buffer.from("ref") }),
    file_unique_id: `u${id}`,
    width: 1,
    height: 1,
    duration: 1,
  });

  const triggers = () => testDb.select().from(schema.groupTriggers);

  /** Runs /trigger on `media` and returns the bot's prompt, as the callback query will carry it. */
  async function triggerPrompt(t: ReturnType<typeof createTestBot>, media: Message) {
    await t.send(groupMessage({ from: admin, text: "/trigger", replyTo: media }));
    const sent = t.calls.findLast((c) => c.method === "sendMessage")!;
    expect(sent.payload["reply_parameters"]).toMatchObject({ message_id: media.message_id });
    return message({ from: ME, text: "?", replyTo: media });
  }

  it("sets, switches and removes a gif with /trigger buttons", async () => {
    const t = createTestBot({ admins: [admin.id] });
    const media = message({ from: member, animation: gif(42n) });
    const promptMsg = await triggerPrompt(t, media);

    await t.send(callbackQuery({ from: admin, data: "trigger:set:clown", message: promptMsg }));
    await expect(triggers()).resolves.toMatchObject([{ key: "42", media: "animation", action: "clown" }]);

    await t.send(callbackQuery({ from: admin, data: "trigger:set:unclown", message: promptMsg }));
    await expect(triggers()).resolves.toMatchObject([{ key: "42", action: "unclown" }]);

    await t.send(callbackQuery({ from: admin, data: "trigger:remove", message: promptMsg }));
    await expect(triggers()).resolves.toHaveLength(0);
  });

  it("detects stickers without a separate command", async () => {
    const t = createTestBot({ admins: [admin.id] });
    const sticker = { ...gif(7n), type: "regular", is_animated: false, is_video: false } as const;
    const promptMsg = await triggerPrompt(t, message({ from: member, sticker }));

    await t.send(callbackQuery({ from: admin, data: "trigger:set:clown", message: promptMsg }));
    await expect(triggers()).resolves.toMatchObject([{ media: "sticker", action: "clown" }]);
  });

  it("shows usage for /trigger without a gif or sticker", async () => {
    const t = createTestBot({ admins: [admin.id] });
    await t.send(groupMessage({ from: admin, text: "/trigger", replyTo: message({ from: member, text: "hi" }) }));

    expect(t.replies()).toHaveLength(1);
    await expect(triggers()).resolves.toHaveLength(0);
  });

  it("ignores trigger buttons pressed by non-admins", async () => {
    const t = createTestBot({ admins: [admin.id] });
    const promptMsg = await triggerPrompt(t, message({ from: member, animation: gif(42n) }));

    await t.send(callbackQuery({ from: member, data: "trigger:set:clown", message: promptMsg }));

    expect(t.calls.findLast((c) => c.method === "answerCallbackQuery")?.payload["show_alert"]).toBe(true);
    await expect(triggers()).resolves.toHaveLength(0);
  });

  it("does not count the same gif twice", async () => {
    const t = createTestBot({ admins: [admin.id] });
    const promptMsg = await triggerPrompt(t, message({ from: member, animation: gif(42n) }));

    await t.send(callbackQuery({ from: admin, data: "trigger:set:clown", message: promptMsg }));
    await t.send(callbackQuery({ from: admin, data: "trigger:set:clown", message: promptMsg }));

    await expect(triggers()).resolves.toHaveLength(1);
  });

  it("stops at the per-kind limit", async () => {
    const t = createTestBot({ admins: [admin.id] });

    for (const id of [1n, 2n, 3n, 4n]) {
      // oxlint-disable-next-line no-await-in-loop -- order matters: each one sees the previous ones.
      const promptMsg = await triggerPrompt(t, message({ from: member, animation: gif(id) }));
      // oxlint-disable-next-line no-await-in-loop
      await t.send(callbackQuery({ from: admin, data: "trigger:set:clown", message: promptMsg }));
    }

    await expect(triggers()).resolves.toHaveLength(3);
    expect(t.calls.findLast((c) => c.method === "answerCallbackQuery")?.payload["show_alert"]).toBe(true);
  });

  it("lists triggers with /triggers and deletes one from its button", async () => {
    await testDb.insert(schema.groups).values({ id: CHAT_ID, name: "Test Group" });
    await testDb.insert(schema.groupTriggers).values([
      { groupId: CHAT_ID, key: "1", fileId: gif(1n).file_id, media: "animation", action: "clown" },
      { groupId: CHAT_ID, key: "2", fileId: null, media: "sticker", action: "unclown" },
    ]);
    const t = createTestBot({ admins: [admin.id] });

    await t.send(groupMessage({ from: admin, text: "/triggers" }));

    expect(t.calls.filter((c) => c.method === "sendAnimation")).toHaveLength(1);
    // The legacy row (no file_id) is a text entry, followed by the summary.
    expect(t.replies()).toHaveLength(2);

    await t.send(callbackQuery({ from: admin, data: "trigger:del:1", message: message({ from: ME, text: "?" }) }));
    await expect(triggers()).resolves.toMatchObject([{ key: "2" }]);
    expect(t.calls.some((c) => c.method === "deleteMessage")).toBe(true);
  });

  it("clears every trigger only after confirmation", async () => {
    await testDb.insert(schema.groups).values({ id: CHAT_ID, name: "Test Group" });
    await testDb.insert(schema.groupTriggers).values([
      { groupId: CHAT_ID, key: "1", media: "animation", action: "clown" },
      { groupId: CHAT_ID, key: "2", media: "sticker", action: "unclown" },
    ]);
    const t = createTestBot({ admins: [admin.id] });
    const summary = message({ from: ME, text: "?" });

    await t.send(callbackQuery({ from: admin, data: "trigger:clear", message: summary }));
    await expect(triggers()).resolves.toHaveLength(2);

    await t.send(callbackQuery({ from: member, data: "trigger:clear:yes", message: summary }));
    await expect(triggers()).resolves.toHaveLength(2);

    await t.send(callbackQuery({ from: admin, data: "trigger:clear:yes", message: summary }));
    await expect(triggers()).resolves.toHaveLength(0);
  });
});
