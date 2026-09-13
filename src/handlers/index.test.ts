import { describe, expect, it } from "vitest";

import { handlers } from ".";

const commandName = /^[0-9_a-z]{1,32}$/;

describe("handlers registry", () => {
  it("only uses Telegram-compatible command names", () => {
    const names = handlers.filter((handler) => handler.kind === "command").map((handler) => handler.name);

    expect(names.filter((name) => !commandName.test(name))).toEqual([]);
  });

  it("registers each command name once", () => {
    const names = handlers.filter((handler) => handler.kind === "command").map((handler) => handler.name);

    expect(names).toHaveLength(new Set(names).size);
  });

  it("gives every command at least one scope", () => {
    const scopes = handlers
      .filter((handler) => handler.kind === "command")
      .map((handler) => handler.scopes)
      .filter((list) => list.length === 0);

    expect(scopes).toEqual([]);
  });

  it("registers each callback data value once", () => {
    const data = handlers.filter((handler) => handler.kind === "callback_query").map((handler) => handler.data);

    expect(data).toHaveLength(new Set(data).size);
  });

  it("contains the 🤡 message handler", () => {
    const messages = handlers.filter((handler) => handler.kind === "message");

    expect(messages).toHaveLength(1);
    expect(messages[0]?.inGroup).toBe(true);
    expect(typeof messages[0]?.filter).toBe("function");
  });
});
