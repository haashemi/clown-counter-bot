import type { MiddlewareFn } from "grammy";

import { CommandGroup } from "@grammyjs/commands";
import { Bot } from "grammy";
import { describe, expect, it, vi } from "vitest";

import type { Handler } from "@/handlers";
import type { BotContext } from "@/lib/bot";

import { isInGroup } from "./filters";
import { applyHandlers } from "./registration";

const token = "12345:TEST-TOKEN";

function setup(handlers: Handler[]) {
  const bot = new Bot<BotContext>(token);
  const commands = new CommandGroup<BotContext>();

  const on = vi.spyOn(bot, "on");
  const callbackQuery = vi.spyOn(bot, "callbackQuery");

  applyHandlers(bot, commands, handlers);

  return { commands, on, callbackQuery };
}

describe("applyHandlers", () => {
  it("adds command handlers to the command group with their scopes", () => {
    const handler = async () => undefined;
    const { commands } = setup([
      { kind: "command", name: "start", description: "🎉", scopes: [{ type: "all_private_chats" }], handler },
    ]);

    expect(commands.commands.map((command) => command.name)).toEqual(["start"]);
    expect(commands.commands[0]?.scopes).toEqual([{ type: "all_private_chats" }]);
  });

  it("registers a group message handler as [isInGroup, filter, handler]", () => {
    const filter: MiddlewareFn<BotContext> = async (_ctx, next) => await next();
    const handler = async () => undefined;

    const { on } = setup([{ kind: "message", inGroup: true, filter, handler }]);

    const middlewares = on.mock.calls[0]?.slice(1) ?? [];

    expect(on.mock.calls).toHaveLength(1);
    expect(on.mock.calls[0]?.[0]).toBe("message");
    expect(middlewares).toHaveLength(3);
    expect(middlewares[0]).toBe(isInGroup);
    expect(middlewares[1]).toBe(filter);
    expect(middlewares[2]).toBe(handler);
  });

  it("omits the group middleware when inGroup is not set", () => {
    const handler = async () => undefined;

    const { on } = setup([{ kind: "message", handler }]);

    const middlewares = on.mock.calls[0]?.slice(1) ?? [];

    expect(on.mock.calls).toHaveLength(1);
    expect(on.mock.calls[0]?.[0]).toBe("message");
    expect(middlewares).toHaveLength(1);
    expect(middlewares[0]).toBe(handler);
  });

  it("registers callback query handlers by their data", () => {
    const handler = async () => undefined;

    const { callbackQuery } = setup([{ kind: "callback_query", data: "resetstats:yes", handler }]);

    expect(callbackQuery.mock.calls).toHaveLength(1);
    expect(callbackQuery.mock.calls[0]?.[0]).toBe("resetstats:yes");
    expect(callbackQuery.mock.calls[0]?.[1]).toBe(handler);
  });
});
