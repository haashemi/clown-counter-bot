# Plan 006: Remove duplicated handler code (one group writer, one reply helper, compact media commands)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: this plan runs **after plans 001–005**, which all touch handler files. Excerpts below are from commit `b805c64`; small differences from those plans are expected (e.g. `forum_topic_created` in `clown.ts`, `STATS_LIMIT` in `stats.ts`, digit normalisation in `setcooldown.ts`, `mediaKey` instead of `parseFileId`). Apply the **patterns** described per step. STOP only if a pattern's target code is missing entirely or `git log --oneline b805c64..HEAD` does not show commits from plans 001–005.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW (pure refactor, covered by plan-001 tests)
- **Depends on**: plans 001, 002, 003, 004, 005 (all touch the same files; run last among code plans)
- **Category**: tech-debt
- **Planned at**: commit `b805c64`, 2026-11-20

## Why this matters

The maintainer asked to cut duplicated code and line count wherever behaviour is unchanged. The handlers repeat the same three things many times: the group upsert (4 copies, one of which — `saveGroup` — never refreshes the group name), the `reply_parameters` boilerplate (~11 copies, although a `ctx.replyTo` helper exists), and the media commands (two near-identical factories, two near-identical interfaces, a `toSpec` adapter). Consolidating them removes roughly 100 lines and makes each fix in the future a one-place fix.

## Current state

- `src/lib/bot/plugins/reply-to.ts` (whole file):
  ```ts
  export interface ReplyToFlavor {
    replyTo: (msg: Message | undefined, text: string) => Promise<Message.TextMessage>;
  }

  export async function replyToMiddleware(ctx: BotContext, next: NextFunction) {
    ctx.replyTo = async (msg, text) => {
      return await ctx.reply(
        text,
        msg ? { reply_parameters: { message_id: msg.message_id, chat_id: msg.chat.id } } : undefined,
      );
    };

    await next();
  }
  ```
- Boilerplate to replace — every occurrence of this shape:
  ```ts
  ctx.reply(TEXT, { reply_parameters: { message_id: msg.message_id, chat_id: msg.chat.id } });
  ```
  Locations at `b805c64`: `setcooldown.ts:16-18, 24-26, 30-32, 45-47`; `stats.ts:36-38, 45-47`; `clownoftheday.ts:29-31, 42-44, 57-59`; `resetstats.ts:22-25` (also has `reply_markup`); `source.ts:9-12` (also has `link_preview_options`); `clown.ts:74` (local `reply` helper using `messageId`/`group.id`, which are the same message).
  Find them all: `grep -rn "reply_parameters" src/handlers`.
- Group upserts — `src/db/index.ts:25-34`:
  ```ts
  type GroupPatch = Partial<Omit<typeof schema.groups.$inferInsert, "id" | "name">>;

  async function saveGroup(chatId: number, name: string | undefined, patch: GroupPatch): Promise<void> {
    const values = { id: chatId, name, ...patch };

    await db.insert(schema.groups).values(values).onConflictDoUpdate({
      target: schema.groups.id,
      set: patch,
    });
  }
  ```
  Inline copies: `resetstats.ts:39-45` (`resetAt`), `setcooldown.ts:37-43` (`cooldown`), `clown.ts:90-93` (name only). Find: `grep -rn "insert(schema.groups)" src/handlers`.
- `src/handlers/admin/media.ts` (132 lines): interfaces `MediaKind` (lines 17–23) and `MediaSpec` (25–32) with the same function fields; `createSetMediaHandler` (34–60) and `createRemoveMediaHandler` (62–91) share their first ~15 lines; `toSpec` (124–132) only copies fields. `KINDS` (93–122) repeats `getFileId`/`getIds`/`apply` lambdas that differ only by column name and media type. i18n keys used: set → `cmd_set<key>` (usage), `_invalid`, `_limit`, `_done` (`{count, max}`); remove → `cmd_remove<key>_usage`, `_invalid`, `_empty`, `_not_found`, `_done`.
- Repeated scope literals: `[{ type: "all_group_chats" }, { type: "all_chat_administrators" }]` in `clown.ts:14`, `stats.ts:54`, `clownoftheday.ts:66`; `[{ type: "all_chat_administrators" }]` in `media.ts:135`, `resetstats.ts:65`, `setcooldown.ts:54`; `[{ type: "all_private_chats" }]` in the 3 static handlers. (Group commands are also added to the admin scope on purpose: Telegram shows admins only the most specific scope's command list.)
- `src/handlers/static/{start,source,privacy}.ts` — three ~11-line files, each one `CommandHandler` replying with one i18n key.
- `src/lib/bot/plugins/auto-retry.ts` — `export function autoRetryPlugin() { return autoRetry(); }`; used once in `src/lib/bot/index.ts`.
- `src/handlers/group/clown.ts:16-41` — `Data` interface spreads the whole `User` plus `name`; only `id`, `is_bot` and the display name are used.

## Commands you will need

| Purpose       | Command                                                             | Expected                                           |
| ------------- | ------------------------------------------------------------------- | -------------------------------------------------- |
| Static checks | `pnpm run check`                                                    | exit 0                                             |
| Tests         | `pnpm test`                                                         | all pass, same count as before the plan + new ones |
| Line count    | `git ls-files 'src/*.ts' \| grep -v test \| xargs wc -l \| tail -1` | record before & after                              |

## Scope

**In scope**: `src/lib/bot/plugins/reply-to.ts`, `src/lib/bot/plugins/auto-retry.ts` (delete), `src/lib/bot/plugins/index.ts`, `src/lib/bot/index.ts` (auto-retry import only), `src/lib/bot/scopes.ts` (create) + export from `src/lib/bot/index.ts`, `src/db/index.ts` (`saveGroup` only), every file in `src/handlers/**` (non-test), `src/handlers/static/index.ts` (create, replaces the 3 static files), handler tests if import paths change.

**Out of scope**: any behaviour change (texts, i18n keys, command names, descriptions, scopes, SQL semantics), `locales/fa.ftl`, `src/lib/media-key.ts`, `registration.ts`, DB schema.

## Git workflow

Branch `advisor/006-dedupe-handlers`. One commit per step, `refactor: ...`. Do not push.

## Steps

Record the "Line count" command output before starting. Then do **Step 5.1 first** (create `src/lib/bot/scopes.ts` and export it) — Steps 3 and 4 import `ADMIN` / `PRIVATE` from `@/lib/bot`.

### Step 1: `replyTo` accepts extra options; use it everywhere

Change the flavor and middleware:

```ts
type ReplyOptions = Parameters<Context["reply"]>[1];

export interface ReplyToFlavor {
  replyTo: (msg: Message | undefined, text: string, other?: ReplyOptions) => Promise<Message.TextMessage>;
}

export async function replyToMiddleware(ctx: BotContext, next: NextFunction) {
  ctx.replyTo = async (msg, text, other) =>
    await ctx.reply(text, {
      ...other,
      ...(msg && { reply_parameters: { message_id: msg.message_id, chat_id: msg.chat.id } }),
    });
  await next();
}
```

(`Context` is `import type { Context } from "grammy"`.) Replace every `grep -rn "reply_parameters" src/handlers` hit with `ctx.replyTo(msg, TEXT)` or `ctx.replyTo(msg, TEXT, { reply_markup: … })` / `{ link_preview_options: … }`. In `clown.ts` delete the local `reply` helper and use `ctx.replyTo(ctx.msg, …)`.

**Verify**: `grep -rn "reply_parameters" src/handlers` → no matches. `pnpm test` → all pass.

### Step 2: `saveGroup` is the only group writer, and refreshes the name

```ts
async function saveGroup(chatId: number, name: string | undefined, patch: GroupPatch = {}): Promise<void> {
  const set = name === undefined ? patch : { ...patch, name };
  const insert = db.insert(schema.groups).values({ id: chatId, name, ...patch });

  await (Object.keys(set).length === 0
    ? insert.onConflictDoNothing()
    : insert.onConflictDoUpdate({ target: schema.groups.id, set }));
}
```

Replace the inline upserts: resetstats → `saveGroup(ctx.chat.id, ctx.chat.title, { resetAt: new Date() })`; setcooldown → `saveGroup(msg.chat.id, msg.chat.title, { cooldown: cooldownMs })`; clown → `saveGroup(group.id, group.name)` (keep it inside the existing `Promise.all`). Leave `migrate.ts` (plan 003) as is — it copies full rows inside a transaction.

Add a test to `admin.test.ts`: `/setcooldown 5` by admin in a chat titled `"Old"`, then again in the same chat titled `"New"` → `groups.name === "New"`.

**Verify**: `grep -rn "insert(schema.groups)" src/handlers | grep -v migrate.ts` → no matches. `pnpm test` → all pass.

### Step 3: Collapse `media.ts`

Target shape (keep Persian descriptions byte-identical, copy them from the current `KINDS`):

```ts
// imports: ADMIN from "@/lib/bot", mediaKey from "@/lib/media-key", db + saveGroup from "@/db"
const MAX_MEDIA = 3;

type MediaColumn = "gifIds" | "stickerIds" | "unclownGifIds" | "unclownStickerIds";

interface MediaKind {
  /** `/set<key>`, `/remove<key>` and i18n keys `cmd_set<key>*`, `cmd_remove<key>*`. */
  key: string;
  column: MediaColumn;
  media: "animation" | "sticker";
  description: string;
}

const KINDS: MediaKind[] = [
  { key: "gif", column: "gifIds", media: "animation", description: "…" },
  { key: "sticker", column: "stickerIds", media: "sticker", description: "…" },
  { key: "unclowngif", column: "unclownGifIds", media: "animation", description: "…" },
  { key: "unclownsticker", column: "unclownStickerIds", media: "sticker", description: "…" },
];

function mediaHandler({ key, column, media }: MediaKind, verb: "remove" | "set") {
  const prefix = `cmd_${verb}${key}`;

  return async (ctx: BotContext) => {
    const { msg } = ctx;
    if (!msg) return;

    const target = msg.reply_to_message;
    if (!target) return await ctx.replyTo(msg, ctx.t(verb === "set" ? prefix : `${prefix}_usage`));

    const fileId = target[media]?.file_id;
    if (!fileId) return await ctx.replyTo(msg, ctx.t(`${prefix}_invalid`));

    const group = await db.query.groups.findFirst({ where: (f, o) => o.eq(f.id, msg.chat.id) });
    const existing = group?.[column] ?? [];
    const id = mediaKey(fileId);

    if (verb === "set") {
      if (existing.length >= MAX_MEDIA) return await ctx.replyTo(msg, ctx.t(`${prefix}_limit`));
      const updated = [...existing, id];
      await saveGroup(msg.chat.id, msg.chat.title, { [column]: updated });
      return await ctx.replyTo(msg, ctx.t(`${prefix}_done`, { count: updated.length, max: MAX_MEDIA }));
    }

    if (existing.length === 0) return await ctx.replyTo(msg, ctx.t(`${prefix}_empty`));
    if (!existing.includes(id)) return await ctx.replyTo(msg, ctx.t(`${prefix}_not_found`));

    const updated = existing.filter((x) => x !== id);
    await saveGroup(msg.chat.id, msg.chat.title, { [column]: updated.length > 0 ? updated : null });
    return await ctx.replyTo(msg, ctx.t(`${prefix}_done`));
  };
}

export const mediaHandlers: CommandHandler[] = KINDS.flatMap((kind) =>
  (["set", "remove"] as const).map((verb) => ({
    kind: "command",
    name: `${verb}${kind.key}`,
    description: `🛡 ${verb === "set" ? "تنظیم" : "حذف"} ${kind.description}`,
    scopes: ADMIN,
    handler: mediaHandler(kind, verb),
  })),
);
```

If TypeScript widens `{ [column]: … }` so it is not assignable to `GroupPatch`, add `satisfies GroupPatch` or one `as GroupPatch` on that literal — nothing broader. Order of the 8 commands in the final list must stay set, remove per kind (same as today) — compare the `name`s.

Add tests to `admin.test.ts`: `/removegif` replying to the gif set earlier → `gifIds` null; `/setsticker` replying to an animation → no change + 1 reply; 4th `/setgif` → limit reply, still 3 entries.

**Verify**: `wc -l src/handlers/admin/media.ts` → ≤ 80. `pnpm test` → all pass.

### Step 4: Merge the three static handlers

Create `src/handlers/static/index.ts`:

```ts
import type { CommandHandler } from "@/handlers";
import { PRIVATE } from "@/lib/bot";

function textCommand(name: string, description: string, key: string, other?: …): CommandHandler {
  return { kind: "command", name, description, scopes: PRIVATE, handler: async (ctx) => await ctx.replyTo(ctx.msg, ctx.t(key), other) };
}

export const staticHandlers: CommandHandler[] = [
  textCommand("start", "🎉 شروع دلقک بازی", "cmd_start"),
  textCommand("source", "🪄 سورس‌کد ربات", "cmd_source", { link_preview_options: { is_disabled: true } }),
  textCommand("privacy", "🔒 حریم شخصی", "cmd_privacy"),
];
```

(Descriptions copied byte-identical from the current files; keep the start/source/privacy order of `handlers`.) Delete `start.ts`, `source.ts`, `privacy.ts`; in `src/handlers/index.ts` replace the three imports/entries with `...staticHandlers`.

**Verify**: `ls src/handlers/static` → `index.ts` (+ test file). `pnpm test` → all pass.

### Step 5: Scope constants, auto-retry wrapper, clown `Data`

1. Create `src/lib/bot/scopes.ts`:
   ```ts
   import type { BotCommandScope } from "grammy/types";

   export const PRIVATE: BotCommandScope[] = [{ type: "all_private_chats" }];
   export const ADMIN: BotCommandScope[] = [{ type: "all_chat_administrators" }];
   /** Group commands are added to the admin scope too: Telegram shows admins only the most specific list. */
   export const GROUP: BotCommandScope[] = [{ type: "all_group_chats" }, ...ADMIN];
   ```
   Export it from `src/lib/bot/index.ts` (`export * from "./scopes";`) and replace every scope literal in `src/handlers/**`.
2. Delete `src/lib/bot/plugins/auto-retry.ts` and its line in `plugins/index.ts`; in `src/lib/bot/index.ts` use `import { autoRetry } from "@grammyjs/auto-retry";` and `this.api.config.use(autoRetry());`.
3. In `clown.ts`, slim `Data` to `{ group: { id: number; name: string }; voter: { id: number; name: string }; clown: { id: number; name: string; isBot: boolean } }` (drop `messageId` — Step 1 made it unused) and update `getData`/`voteHandler` accordingly. Behaviour unchanged.

**Verify**: `grep -rn 'type: "all_' src/handlers` → no matches. `grep -rn autoRetryPlugin src` → no matches. `pnpm run check` → exit 0. `pnpm test` → all pass. `pnpm build` → exit 0.

## Test plan

Plan-001 characterization tests guard behaviour; new tests in Steps 2–3 cover the name-refresh fix and the media paths the collapse rewrites.

## Done criteria

- [ ] `grep -rn "reply_parameters" src/handlers` → no matches
- [ ] `grep -rn "insert(schema.groups)" src/handlers | grep -v migrate.ts` → no matches
- [ ] `wc -l src/handlers/admin/media.ts` ≤ 80
- [ ] Non-test `src` line count reduced by ≥ 70 versus the recorded start (report both numbers)
- [ ] `pnpm run check`, `pnpm test`, `pnpm build` exit 0
- [ ] Command list unchanged: compare `name`s collected from `handlers` before/after (a quick throwaway test or `node` script; delete it afterwards)
- [ ] `plans/README.md` row updated

## STOP conditions

- Any plan-001 test needs its expected value changed (that is a behaviour change).
- `onConflictDoUpdate` with a `set` containing `name` errors for callback-query contexts (where `ctx.chat.title` may be undefined) even with the `name === undefined` guard.
- The static-handler merge changes the order or text of `setMyCommands` (check the commands list in the done criteria).

## Maintenance notes

- New group settings: add a column, then call `saveGroup(chatId, title, { newColumn })` — no new upsert code.
- New media kinds: one line in `KINDS` + the i18n keys.
- `saveGroup` now refreshes the stored group name on every write — intended.
- Known, deliberately not fixed: `/setgif` on an already-registered gif adds a duplicate entry (needs a new i18n string; maintainer's call).
