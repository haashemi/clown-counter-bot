import { describe, expect, it, vi } from "vitest";

import type { BotContext } from "..";

import { isInGroup } from "./is-in-group";

describe("isInGroup", () => {
  it.each(["group", "supergroup"])("continues %s chats", async (type) => {
    const next = vi.fn(async () => {});

    await isInGroup({ chat: { type } } as BotContext, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["private", { type: "private" }],
    ["missing", undefined],
  ])("stops %s chats", async (_name, chat) => {
    const next = vi.fn(async () => {});

    await isInGroup({ chat } as BotContext, next);

    expect(next).not.toHaveBeenCalled();
  });
});
