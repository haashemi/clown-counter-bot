# Plan 001: Establish a verification baseline (typecheck, bot-level tests, CI)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat b805c64..HEAD -- tsconfig.json vite.config.ts package.json pnpm-workspace.yaml src/db/index.ts src/lib/bot/filters/is-in-group.test.ts .github`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `b805c64`, 2026-11-20

## Why this matters

Every later plan (bug fixes, a concurrency fix, a parser rewrite, a dedupe refactor) changes bot behavior, and right now nothing can prove behavior was preserved. The repo has one trivial test, TypeScript type checking is not run anywhere (`vp check` = format + lint only), the test file itself has type errors, and there is no CI. This plan adds (1) a real type check inside `vp check`, (2) an in-process test harness that drives the real bot with fake Telegram API calls and a real in-memory PostgreSQL (PGlite), (3) characterization tests of current behavior, and (4) a GitHub Actions workflow.

## Current state

Project: Telegram bot, TypeScript, grammY, drizzle-orm + PostgreSQL (`pg`), toolchain is **Vite+** (`vp` CLI from the `vite-plus` dev dependency). Package manager pnpm (catalogs in `pnpm-workspace.yaml`). All user-facing text is Persian in `locales/fa.ftl`.

- `tsconfig.json` — has `"paths"` but **no `include`**, so `tsc` also checks the generated `dist/` folder. Paths today:
  ```json
  "paths": {
    "@/db": ["./src/db/index.ts"],
    "@/handlers": ["./src/handlers/index.ts"],
    "@/handlers/*": ["./src/handlers/*"],
    "@/lib/*": ["./src/lib/*"]
  }
  ```
- `vite.config.ts` (full file today):
  ```ts
  import { defineOxlintConfig } from "@fullstacksjs/oxlint-config";
  import { defineConfig } from "vite-plus";

  export default defineConfig({
    resolve: { tsconfigPaths: true },

    fmt: { printWidth: 120, ignorePatterns: ["dist/**", "drizzle/**"] },
    lint: defineOxlintConfig({
      modules: { nodejs: true, vitest: true },
      options: { esm: false },
      ignorePatterns: ["dist/**", "drizzle/**"],
    }),
    pack: { ... },
    staged: { ... },
  });
  ```
- Running `vp lint --type-aware --type-check` today (read-only) reports exactly these errors:
  ```
  vite.config.ts:8:3: error typescript(TS2769): No overload matches this call.
  src/lib/bot/filters/is-in-group.test.ts:1:42: error typescript(TS2307): Cannot find module 'vitest' ...
  src/lib/bot/filters/is-in-group.test.ts:8:65: error typescript(TS7006): Parameter 'type' implicitly has an 'any' type.
  src/lib/bot/filters/is-in-group.test.ts:19:31: error typescript(TS7006): Parameter '_name' implicitly has an 'any' type.
  src/lib/bot/filters/is-in-group.test.ts:19:38: error typescript(TS7006): Parameter 'chat' implicitly has an 'any' type.
  ```
  The `vite.config.ts` error is a third-party type clash: `@fullstacksjs/oxlint-config` ships types from a different `oxlint` version than the one `vite-plus` uses ("Two different types with this name exist, but they are unrelated"). It is not a bug in this repo.
  The `vitest` error: under Vite+, test APIs are imported from `vite-plus/test`, not `vitest` (Vite+ docs, `node_modules/vite-plus/docs/guide/test.md`: `import { describe, expect, it, vi } from 'vite-plus/test';`).
- `src/lib/bot/filters/is-in-group.test.ts` — the only test; imports from `"vitest"`.
- `src/db/index.ts` (lines 1–13) creates the pg pool and drizzle instance at import time, and reads `config` (which throws at import if `.env` is missing):
  ```ts
  import { drizzle } from "drizzle-orm/node-postgres";
  import { migrate } from "drizzle-orm/node-postgres/migrator";
  import { join } from "node:path";
  import { Pool } from "pg";

  import { config } from "@/lib/config";
  import { findAvailablePath } from "@/lib/utils";

  import * as schema from "./schema";

  const pool = new Pool({ connectionString: config.DATABASE_URL, max: 5 });

  const db = drizzle({ client: pool, casing: "snake_case", schema });
  ```
  The rest of the file defines `runMigrations()` and `saveGroup()` using `db`, and ends with `export { db, runMigrations, saveGroup, schema };`.
- `src/lib/bot/index.ts` — `class Bot extends GrammyBot<BotContext>`; constructor `new Bot(token, { plugins })` installs plugins, the shared `CommandGroup`, and `autoRetry` as an API transformer. `registerHandlers(...handlers)` binds handlers. `run()` calls `setMyCommands` and starts `@grammyjs/runner` (never call `run()` in tests).
- `src/index.ts` shows the production wiring to replicate in tests:
  ```ts
  const bot = new Bot(config.BOT_TOKEN, {
    plugins: [i18nMiddleware(await getLocalesDirectory()), replyToMiddleware],
  });
  bot.registerHandlers(...handlers);
  ```
- Handlers live in `src/handlers/**` and are listed in `src/handlers/index.ts` (`export const handlers: Handler[]`).
- Conventions (from `AGENTS.md`, must follow): imports use path aliases (`@/lib/*`, `@/db`, `@/handlers`), never relative imports across folders; `import type` lines are grouped before value imports (see any handler, e.g. `src/handlers/group/stats.ts:1-7`).
- No `.github/` directory exists.

## Commands you will need

| Purpose       | Command                                      | Expected on success             |
| ------------- | -------------------------------------------- | ------------------------------- |
| Install       | `pnpm install`                               | exit 0                          |
| Static checks | `pnpm run check` (runs `vp check`)           | exit 0                          |
| Tests         | `pnpm test` (runs `vp test --run`)           | all pass                        |
| One test file | `pnpm test src/handlers/group/clown.test.ts` | all pass                        |
| Build         | `pnpm build`                                 | exit 0, `dist/index.mjs` exists |

## Scope

**In scope**:

- `tsconfig.json`
- `vite.config.ts`
- `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` (adding one dev dependency)
- `src/db/index.ts`, `src/db/client.ts` (create)
- `src/lib/bot/filters/is-in-group.test.ts`
- `src/test/` (create: `db.ts`, `bot.ts`, `file-id.ts`)
- New test files: `src/handlers/group/clown.test.ts`, `src/handlers/group/stats.test.ts`, `src/handlers/group/clownoftheday.test.ts`, `src/handlers/admin/admin.test.ts`
- `.github/workflows/ci.yml` (create)

**Out of scope** (do NOT touch):

- Any handler source file under `src/handlers/**` (except new `*.test.ts`). Tests must describe **current** behavior, including behavior that looks wrong — later plans fix it. Specifically do not fix: `/source` replying with the start text, cooldown races, `/stats` length.
- `src/lib/file-id/**` — a later plan rewrites it.
- `AGENTS.md`, `README.md` — a later plan rewrites docs.

## Git workflow

- Branch: `advisor/001-verification-baseline`
- Conventional Commits (enforced by commitlint), e.g. `test: add bot-level test harness`, `ci: add github actions workflow`. Repo examples: `fix: fix not listening on text messages`, `refactor: a little code cleanup`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Fix tsconfig scope and aliases

In `tsconfig.json`, add a top-level `"include": ["src", "*.ts"]` (sibling of `compilerOptions`). In `paths`, add two entries (keep existing ones):

```json
"@/db/*": ["./src/db/*"],
"@/test/*": ["./src/test/*"]
```

**Verify**: `pnpm exec tsc -p tsconfig.json --noEmit --incremental false 2>&1 | grep -c "dist/"` → `0`.

### Step 2: Turn type checking on inside `vp check`

In `vite.config.ts`, inside the object passed to `defineOxlintConfig`, change `options: { esm: false }` to `options: { esm: false, typeAware: true, typeCheck: true }`.

Directly above the `lint:` line add:

```ts
// @ts-expect-error -- @fullstacksjs/oxlint-config bundles different oxlint types than vite-plus (TS2769); remove when versions align.
```

**Verify**: `pnpm run check` → fails, and its output contains `is-in-group.test.ts` TS7006/TS2307 errors (proves type check runs). It must NOT contain `vite.config.ts:8`. If new **lint** (non-`typescript(...)`) errors appear from type-aware rules, count them: ≤10 → fix them only if they are in `src/test/**` or test files, otherwise STOP and report the list.

### Step 3: Fix the existing test file

In `src/lib/bot/filters/is-in-group.test.ts`: change the import to `from "vite-plus/test"`; add explicit parameter types so no `any` remains (`async (type: string) =>` and type the table, e.g. `it.each<[string, { type: string } | undefined]>([...])`).

**Verify**: `pnpm run check` → exit 0. `pnpm test` → 4 tests pass.

### Step 4: Split the DB client out so tests can replace it

Create `src/db/client.ts` containing only the pool + drizzle construction (moved from `src/db/index.ts` lines 1–13, minus migrator/utils imports):

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { config } from "@/lib/config";

import * as schema from "./schema";

const pool = new Pool({ connectionString: config.DATABASE_URL, max: 5 });

export const db = drizzle({ client: pool, casing: "snake_case", schema });
```

In `src/db/index.ts`, delete those moved lines and `import { db } from "./client";` instead. Keep `runMigrations`, `saveGroup`, `GroupPatch` and the final `export { db, runMigrations, saveGroup, schema };` unchanged.

**Verify**: `pnpm run check` → exit 0; `pnpm build` → exit 0.

### Step 5: Add PGlite (in-memory PostgreSQL) as a dev dependency

1. Read the drizzle peer range: `pnpm view drizzle-orm@0.45.2 peerDependencies --json | grep pglite`.
2. Pick the newest exact `@electric-sql/pglite` version inside that range (`pnpm view @electric-sql/pglite versions --json`).
3. Add it to the `db` catalog in `pnpm-workspace.yaml` (exact version, no caret — the repo uses `savePrefix: ""`), and add `"@electric-sql/pglite": "catalog:db"` to `devDependencies` in `package.json` (keep keys alphabetical).
4. `pnpm install`.

**Verify**: `pnpm ls @electric-sql/pglite` shows the chosen version; `git diff --stat` shows only `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` changed in this step.

### Step 6: Create the test harness

Create `src/test/db.ts`:

```ts
import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { join } from "node:path";

import * as schema from "@/db/schema";

export const testDb = drizzle({ client: new PGlite(), casing: "snake_case", schema });

await migrate(testDb, { migrationsFolder: join(process.cwd(), "drizzle") });

export async function resetDb(): Promise<void> {
  await testDb.execute(sql`TRUNCATE clown_votes, groups, users RESTART IDENTITY CASCADE`);
}
```

Create `src/test/bot.ts` exporting:

- `ME` — a `UserFromGetMe` for the bot (`id: 999`, `is_bot: true`, `first_name: "ClownCounter"`, `username: "ClownCounterBot"`, plus the boolean fields the type requires set to `false`).
- `createTestBot({ admins = [] }: { admins?: number[] } = {})` that:
  1. constructs `new Bot("123:test", { plugins: [i18nMiddleware(join(process.cwd(), "locales")), replyToMiddleware] })` (imports from `@/lib/bot`), sets `bot.botInfo = ME`, calls `bot.registerHandlers(...handlers)` (from `@/handlers`);
  2. installs a fake API transformer with `bot.api.config.use((_prev, method, payload) => ...)` that pushes `{ method, payload }` into a `calls` array and **never calls `_prev`**. Results: `sendMessage` / `editMessageText` → a minimal message `{ message_id: <incrementing>, date: 0, chat: { id: payload.chat_id, type: "supergroup" }, text: payload.text }`; `getChatMember` → `{ status: admins.includes(payload.user_id) ? "administrator" : "member", user: { id: payload.user_id, is_bot: false, first_name: "x" } }`; anything else → `true`. Return `Promise.resolve({ ok: true, result })` (cast as needed).
  3. returns `{ bot, calls, send: (update: Update) => bot.handleUpdate(update), replies: () => calls.filter(c => c.method === "sendMessage").map(c => c.payload.text) }`.
- Update builders: `groupMessage(opts)` and `callbackQuery(opts)` returning a full `Update` with an incrementing `update_id`. `groupMessage` options: `chatId` (default `-100123`), `chatType` (default `"supergroup"`), `from: User`, `text?`, `replyTo?: Message` (sets `reply_to_message`), `animation?`, `sticker?`. When `text` starts with `/`, add `entities: [{ type: "bot_command", offset: 0, length: <length of first word> }]`. `callbackQuery` options: `from: User`, `data: string`, `message: Message` (the bot's prompt message, with `chat` set to the group); fill `id` with any string and `chat_instance: "1"`.
- `user(id, firstName)` helper → `{ id, is_bot: false, first_name: firstName }`.

Create `src/test/file-id.ts` exporting `encodeFileId({ typeId, dcId = 4, id, accessHash = 0n, fileReference, version = 4, subVersion = 0 })` that builds a Telegram Bot API file_id: buffer = uint32LE(typeId | (fileReference ? 1 << 25 : 0)), uint32LE(dcId), [TL-string(fileReference)], int64LE(id), int64LE(accessHash), then `subVersion` byte (only when version is 4), then `version` byte; RLE-encode zero runs (each run of n zero bytes, n ≤ 255, becomes the two bytes `0, n`); return `buffer.toString("base64url")`. TL-string: if length < 254 → `[len, ...bytes]`, else `[254, len & 0xff, (len >> 8) & 0xff, (len >> 16) & 0xff, ...bytes]`; then pad with zero bytes to a multiple of 4. Animation `typeId` is `10`, sticker is `8`. Add a sanity test `src/test/file-id.test.ts`: for ids `1n`, `-1n`, `0x0123456789abcdefn` and fileReference lengths `undefined`, 0, 3, 253, 300, `parseFileId(encodeFileId(...)).id === id` (import `parseFileId` from `@/lib/file-id`).

Every test file that touches the DB starts with:

```ts
vi.mock("@/db/client", async () => ({ db: (await import("@/test/db")).testDb }));
```

and calls `await resetDb()` in `beforeEach`.

**Verify**: `pnpm test src/test` → file-id sanity tests pass. `pnpm run check` → exit 0.

### Step 7: Characterization tests (assert CURRENT behavior)

Assert on rows (`testDb.select().from(schema.clownVotes)`) and on reply texts (`toContain` the names; replies are Persian Fluent strings with Unicode isolation marks around variables, so never use exact equality on whole messages). Model structure on `src/lib/bot/filters/is-in-group.test.ts` (`describe`/`it`).

`src/handlers/group/clown.test.ts`:

- Alice replies `🤡` to Bob's message → 1 row (`quantity: 1`, voter Alice, clown Bob); reply contains `Bob` and `Alice`.
- `/clown` as a reply → same result.
- `😇` reply → 1 row with `quantity: -1`.
- Second `🤡` by Alice within cooldown → still 1 row; 2nd reply differs from the 1st.
- With `groups.cooldown = 0` (insert the group row first) → two votes produce 2 rows.
- Alice replies `🤡` to her own message → 0 rows, 1 reply.
- Reply to a bot user (`is_bot: true`) → 0 rows.
- Reply to the bot itself (`from: ME`) → 0 rows.
- `🤡` without a reply → 0 rows, 0 replies.
- Text `hello` as a reply → 0 rows, 0 `sendMessage` calls.
- Private chat (`chatType: "private"`, `chatId` positive) `🤡` reply → 0 rows, 0 replies.
- Configured gif: insert group with `gifIds: [parseFileId(f).id.toString()]` where `f = encodeFileId({ typeId: 10, id: 42n, fileReference: Buffer.from("ref") })`; Alice replies with `animation: { file_id: f, file_unique_id: "u", width: 1, height: 1, duration: 1 }` → 1 row.

`src/handlers/group/stats.test.ts`:

- No votes → 1 reply, 0 rows.
- Bob 2 votes, Carol 1 vote (insert rows directly) → reply lists Bob before Carol.
- `groups.resetAt` set to now and a vote dated 1 day earlier → that vote excluded.

`src/handlers/group/clownoftheday.test.ts`:

- No votes in group → reply, 0 new rows.
- With Bob clowned once → a new row with `voterId: null`, `clownId: Bob`, `quantity` between 5 and 20 inclusive.
- Second call immediately → no additional row.

`src/handlers/admin/admin.test.ts` (use `createTestBot({ admins: [ADMIN_ID] })`):

- Admin `/setcooldown 5` → `groups.cooldown === 300000`.
- Non-admin `/setcooldown 5` → no group row, 0 replies (the commands plugin filters non-admins).
- Admin `/setcooldown 61` → no cooldown stored, 1 reply.
- Admin `/resetstats` → 1 reply whose payload has `reply_markup`; then `callbackQuery({ from: nonAdmin, data: "resetstats:yes", message })` → an `answerCallbackQuery` call with `show_alert: true`, `resetAt` still null; then same from admin → `resetAt` not null.
- Admin `/setgif` replying to an animation message → `gifIds` has 1 entry.

**Verify**: `pnpm test` → all pass (≥ 25 tests). Run it 3 times; all 3 pass (no flakiness).

### Step 8: Add CI

Find the latest exact release tag: `gh api repos/voidzero-dev/setup-vp/releases/latest --jq .tag_name` (Vite+ docs say: use an exact version, never the `v1` tag). Also `gh api repos/actions/checkout/releases/latest --jq .tag_name`.

Create `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<exact tag>
      - uses: voidzero-dev/setup-vp@<exact tag>
        with:
          node-version: "22"
          cache: true
      - run: vp install
      - run: vp check
      - run: vp test --run
      - run: vp build
```

**Verify**: `pnpm exec vp fmt --check .github/workflows/ci.yml` → exit 0 (or the file is ignored by fmt; either is fine). Locally re-run the four commands: `pnpm install --frozen-lockfile && pnpm run check && pnpm test && pnpm build` → all exit 0.

## Test plan

Covered in Steps 6–7: ~25 characterization tests through the real bot (`bot.handleUpdate`) with fake Telegram API and real SQL on PGlite, plus file-id encoder sanity tests. Pattern file: `src/lib/bot/filters/is-in-group.test.ts`.

## Done criteria

- [ ] `pnpm run check` exits 0 and type checking is active (`grep -n typeCheck vite.config.ts` matches)
- [ ] `pnpm test` exits 0 with ≥ 25 tests; 3 consecutive runs pass
- [ ] `pnpm build` exits 0
- [ ] `grep -rn 'from "vitest"' src` → no matches
- [ ] `.github/workflows/ci.yml` exists and pins exact action versions (`grep -c "@v1$" .github/workflows/ci.yml` → 0)
- [ ] `git status` shows only in-scope files changed
- [ ] `plans/README.md` status row updated

## STOP conditions

- Step 2 shows type errors in `src/` files other than `is-in-group.test.ts` (means the repo state differs from planning; report the list).
- `drizzle-orm/pglite` migrator fails to apply `drizzle/*.sql` (e.g. identity/sequence syntax unsupported) after one fix attempt.
- `bot.handleUpdate` throws "Bot not initialized" even with `bot.botInfo = ME` set.
- A characterization test can only pass by changing handler source code.
- Any test makes a real network request (transformer not intercepting).

## Maintenance notes

- New handlers get a test file next to them using `createTestBot` + the `vi.mock("@/db/client", ...)` line.
- Drop the `@ts-expect-error` in `vite.config.ts` when `@fullstacksjs/oxlint-config` and `vite-plus` resolve the same `oxlint` version — TypeScript will flag it as unused at that point.
- `src/test/**` is not bundled (`pack.entry` is only `src/index.ts`); keep it that way.
