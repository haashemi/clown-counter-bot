# Plan 003: Keep stats when a group upgrades to a supergroup

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat b805c64..HEAD -- src/lib/bot/registration.ts src/lib/bot/filters src/handlers/index.ts src/handlers/group/clown-filter.ts`
> Plan 001 edits `src/lib/bot/filters/is-in-group.test.ts` (import + types) — that is expected. Any other change in these paths: compare with the excerpts below; STOP on mismatch.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED (moves rows between primary keys)
- **Depends on**: plans/001-verification-baseline.md (test harness). Independent of 002.
- **Category**: bug
- **Planned at**: commit `b805c64`, 2026-11-20

## Why this matters

When a Telegram "basic group" becomes a supergroup (this happens automatically, e.g. when an admin enables chat history for new members or the group grows), the chat gets a **new id**. Telegram sends a service message with `migrate_to_chat_id` in the old chat. The bot ignores it, so every vote, the custom gifs/stickers, the cooldown and the reset date stay attached to the dead old id — the group's `/stats` silently starts from zero.

A second problem blocks the fix: message handlers are registered as one middleware chain where a non-matching filter **stops** the chain instead of falling through. `isClownCall` returns without calling `next()` for every non-clown message, so any message handler registered after it never runs. The fix changes `MessageHandler.filter` to a boolean predicate and uses grammY's built-in `Composer.filter` and `chatType`, which fall through on `false`. This also deletes the custom `isInGroup` middleware.

## Current state

- `src/lib/bot/registration.ts:12-21, 38-40`:
  ```ts
  function messageChain(handler: MessageHandler): MiddlewareFn<BotContext>[] {
    const chain: MiddlewareFn<BotContext>[] = [];

    if (handler.inGroup) chain.push(isInGroup);
    if (handler.filter) chain.push(handler.filter);
    chain.push(handler.handler);

    return chain;
  }
  ...
      case "message":
        bot.on("message", ...messageChain(handler));
        break;
  ```
- `src/handlers/index.ts:30-37`:
  ```ts
  export interface MessageHandler {
    kind: "message";
    /** Restrict the handler to group/supergroup chats. */
    inGroup?: boolean;
    /** Optional matcher that runs before `handler`; it must call `next()` for `handler` to run. */
    filter?: MiddlewareFn<BotContext>;
    handler: HandlerFn;
  }
  ```
  and the `handlers` array at lines 45–61 (groups section: `...clownHandlers, statsHandler, clownOfTheDayHandler`).
- `src/handlers/group/clown-filter.ts:41-54`:
  ```ts
  /** Matcher for the 🤡/دلقک flow: sets `ctx.clownCall` and continues, or stops the chain. */
  export const isClownCall: MiddlewareFn<BotContext> = async (ctx, next) => {
    if (!ctx.msg || !ctx.chat) return null;

    const call = matchText(ctx.msg.text) ?? (await matchMediaCall(ctx));

    if (!call) return null;

    // False positive: each grammY update gets a fresh ctx; there is no shared mutable state.
    // eslint-disable-next-line require-atomic-updates
    ctx.clownCall = call;

    return await next();
  };
  ```
- `src/lib/bot/filters/is-in-group.ts` (whole file, 9 lines) — `isInGroup` middleware; exported from `src/lib/bot/filters/index.ts` (`export * from "./is-in-group";`); tested by `is-in-group.test.ts`. Its only user is `registration.ts`.
- grammY API (installed `grammy` 1.46.0, `node_modules/grammy/out/composer.d.ts:510`): `filter(predicate: (ctx: C) => MaybePromise<boolean>, ...middleware)` runs middleware when the predicate is true, otherwise calls `next()`. `chatType(["group", "supergroup"])` likewise falls through for other chats.
- Schema (`src/db/schema/tables.ts`): `groups(id bigint PK, name, gifIds, stickerIds, unclownGifIds, unclownStickerIds, resetAt, cooldown)`; `clown_votes.group_id` → `groups.id` FK, **no** `ON UPDATE CASCADE`. So the move must be: create new group row → repoint votes → delete old row, in one transaction.
- Handler file convention: one feature per file, exported handler object typed `MessageHandler`/`CommandHandler` — see `src/handlers/group/stats.ts`.

## Commands you will need

| Purpose       | Command          | Expected |
| ------------- | ---------------- | -------- |
| Static checks | `pnpm run check` | exit 0   |
| Tests         | `pnpm test`      | all pass |

## Scope

**In scope**: `src/lib/bot/registration.ts`, `src/handlers/index.ts`, `src/handlers/group/clown-filter.ts`, `src/handlers/group/migrate.ts` (create), `src/handlers/group/migrate.test.ts` (create), `src/lib/bot/filters/index.ts`, `src/lib/bot/filters/is-in-group.ts` (delete), `src/lib/bot/filters/is-in-group.test.ts` (delete).

**Out of scope**: DB schema / migrations (no FK change needed), `clown.ts`, the `migrate_from_chat_id` message in the new chat (intentionally ignored — one side is enough).

## Git workflow

Branch `advisor/003-supergroup-migration`. Commits: `refactor: make message handler filters fall through`, then `fix: move group data on supergroup migration`. Do not push.

## Steps

### Step 1: Predicate filters with fall-through registration

1. In `src/handlers/index.ts`, change `MessageHandler.filter` to:
   ```ts
   /** Optional predicate; when it returns false the update falls through to later handlers. */
   filter?: (ctx: BotContext) => Promise<boolean> | boolean;
   ```
   Remove the now-unused `MiddlewareFn` import if nothing else uses it.
2. In `registration.ts`, delete `messageChain` and the `isInGroup` import; the message case becomes:
   ```ts
   case "message": {
     const chats = handler.inGroup ? bot.chatType(["group", "supergroup"]) : bot;
     chats.on("message").filter(handler.filter ?? (() => true), handler.handler);
     break;
   }
   ```
3. In `clown-filter.ts`, turn `isClownCall` into a predicate:
   ```ts
   /** Matcher for the 🤡/دلقک flow: sets `ctx.clownCall` and returns true, or returns false. */
   export async function isClownCall(ctx: BotContext): Promise<boolean> {
     if (!ctx.msg || !ctx.chat) return false;
     const call = matchText(ctx.msg.text) ?? (await matchMediaCall(ctx));
     if (!call) return false;
     ctx.clownCall = call;
     return true;
   }
   ```
   Keep the "False positive" comment + lint-disable line only if `pnpm run check` reports `require-atomic-updates` without it. Remove the unused `MiddlewareFn` import.
4. Delete `src/lib/bot/filters/is-in-group.ts` and `is-in-group.test.ts`; remove its line from `filters/index.ts`.

**Verify**: `pnpm run check` → exit 0. `pnpm test` → all plan-001 clown tests still pass (private-chat `🤡` → 0 rows; non-matching text → 0 replies). `grep -rn isInGroup src` → no matches.

### Step 2: Migration handler

Create `src/handlers/group/migrate.ts`:

```ts
import { eq } from "drizzle-orm";

import type { MessageHandler } from "@/handlers";
import type { BotContext } from "@/lib/bot";

import { db, schema } from "@/db";

/** Basic group → supergroup: Telegram assigns a new chat id; move the group's settings and votes to it. */
async function migrateGroup(ctx: BotContext) {
  const fromId = ctx.chat?.id;
  const toId = ctx.msg?.migrate_to_chat_id;
  if (fromId === undefined || toId === undefined) return;

  await db.transaction(async (tx) => {
    const old = await tx.query.groups.findFirst({ where: (f, o) => o.eq(f.id, fromId) });
    if (!old) return; // never used, or already migrated

    const { id: _oldId, ...settings } = old;
    await tx
      .insert(schema.groups)
      .values({ ...settings, id: toId })
      .onConflictDoUpdate({ target: schema.groups.id, set: settings });
    await tx.update(schema.clownVotes).set({ groupId: toId }).where(eq(schema.clownVotes.groupId, fromId));
    await tx.delete(schema.groups).where(eq(schema.groups.id, fromId));
  });
}

export const migrateHandler: MessageHandler = {
  kind: "message",
  inGroup: true,
  filter: (ctx) => ctx.msg?.migrate_to_chat_id !== undefined,
  handler: migrateGroup,
};
```

(If `_oldId` trips the unused-var lint, use `const { id, ...settings } = old; void id;` or the repo's lint-accepted equivalent.)
Add `migrateHandler` to the Groups section of `handlers` in `src/handlers/index.ts` (import it like the others).

**Verify**: `pnpm run check` → exit 0.

### Step 3: Tests — `src/handlers/group/migrate.test.ts`

Using plan 001's harness (`createTestBot`, `resetDb`, the `vi.mock("@/db/client", ...)` line):

- Seed: group `-4001` (`cooldown: 0`, `gifIds: ["7"]`, `resetAt: null`), users Alice/Bob, 2 votes in `-4001`.
- Send an update in chat `{ id: -4001, type: "group" }` whose message has `migrate_to_chat_id: -1004001` and no text.
- Expect: `groups` contains exactly one row, id `-1004001`, `cooldown: 0`, `gifIds: ["7"]`; both votes have `groupId: -1004001`.
- Send the same update again → no throw; state unchanged.
- `/stats` in chat `{ id: -1004001, type: "supergroup" }` → reply contains `Bob`.
- Migration for a chat with no group row → no throw, 0 rows.

**Verify**: `pnpm test src/handlers/group/migrate.test.ts` → 3+ pass; `pnpm test` → all pass.

## Test plan

Step 3 tests, plus the existing plan-001 clown tests act as regression for the registration change.

## Done criteria

- [ ] `pnpm run check` exit 0; `pnpm test` exit 0
- [ ] `grep -rn "isInGroup\|messageChain" src` → no matches
- [ ] `grep -n migrateHandler src/handlers/index.ts` → 2 matches (import + array)
- [ ] Only in-scope files changed; `plans/README.md` row updated

## STOP conditions

- TypeScript rejects `chats.on("message").filter(handler.filter ...)` because of context-type narrowing and a single `as` cast at that line does not fix it.
- `db.transaction` callback has no `tx.query.groups` (drizzle relational API missing in transactions) — report rather than rewriting with raw SQL.
- Any plan-001 test changes result after Step 1.

## Maintenance notes

- New message handlers now compose safely in any order; a filter returning `false` passes the update on.
- If a FK with `ON UPDATE CASCADE` is ever added, the migration could become a single `UPDATE groups SET id = …`; not worth a schema migration today.
- Reviewer: check the transaction order (insert new → update votes → delete old) — any other order violates the FK.
