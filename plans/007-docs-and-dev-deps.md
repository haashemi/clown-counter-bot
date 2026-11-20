# Plan 007: Bring AGENTS.md/README up to date and clear dev-dependency advisories

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git log --oneline b805c64..HEAD` must show commits from plans 001–006 (this plan documents their end state). If some plan is not DONE in `plans/README.md`, document only what exists in the code — every claim you write must be checked with the grep given next to it.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans 001–006 (documents their results)
- **Category**: docs
- **Planned at**: commit `b805c64`, 2026-11-20

## Why this matters

`AGENTS.md` is what coding agents read first in this repo, and at `b805c64` several of its claims are false, so agents get misled. `README.md` lists 4 of the bot's ~20 commands. `pnpm audit` reports 2 critical and 8 high advisories. All of them are in **dev-only** dependencies (prod deps are clean), but they still run on the developer's machine and in CI.

## Current state

False/stale claims in `AGENTS.md` at `b805c64` (verify each before editing):

- "Env: `@t3-oss/env-core` + `zod`." — neither is a dependency; `src/lib/config.ts` uses `process.loadEnvFile` + regexes.
- "`vpr start` — run the built `dist/index.js` file." — script is `node dist/index.mjs`.
- "Migrations also run automatically at startup via `src/db/migrate.ts` (`runMigrations` …)" — `runMigrations` lives in `src/db/index.ts`.
- "see `src/lib/parse-file-id.ts`" — gone (after plan 005: `src/lib/media-key.ts`, `mediaKey`).
- "Handlers … `filter` … middleware", "shared bot guards (e.g. `isAdmin`) in `src/lib/bot/filters/`" — after plan 003 `filter` is a boolean predicate and `isInGroup` is gone (grammY `chatType` is used).
- Gotcha "The single-file bundle keeps the `pg` family external … `node_modules` must ship" — `vite.config.ts` has `deps: { alwaysBundle: [/.*/] }`; verify in Step 2 whether `dist/` runs without `node_modules`.
- Verify line "`pnpm run check` … — **no** TypeScript typecheck … `tsc -p tsconfig.json` is unusable" — after plan 001 `vp check` type-checks (`typeCheck: true`) and `tsconfig.json` has `include`.
- `isClownCall` gotcha lists only `🤡` / `دلقک`; unclown texts are `😇`, `ستون`, `آدم عاقل` (`src/handlers/group/clown-filter.ts:8-9`).

`README.md` command tables list only `/start`, `/privacy`, `/source`, `/stats`, `/clown`. Full list: `grep -rn 'name: "\|name: `' src/handlers`and`src/handlers/admin/media.ts` `KINDS`(set/remove × gif, sticker, unclowngif, unclownsticker), plus`/unclown`, `/clownoftheday`, `/setcooldown <0–60>`, `/resetstats`. README self-host says to run `pnpm db:migrate` manually, but migrations run at startup.

Audit at planning time (`pnpm audit`): critical `tinypool` (via `vite-plus` → `oxfmt`), high `brace-expansion`, `source-map-js` (via `@fullstacksjs/oxlint-config` → `eslint-plugin-better-tailwindcss`), `fast-uri`, `js-yaml` (via `@commitlint/cli`), `vite`/`vite-plus` (Windows-only `launch-editor`). `pnpm audit --prod` → "No known vulnerabilities found".

Catalog versions live in `pnpm-workspace.yaml` (`catalogs.tooling`, `catalogs.lint`); exact pins (`savePrefix: ""`); an `overrides:` block already exists there.

## Commands you will need

| Purpose       | Command                         | Expected          |
| ------------- | ------------------------------- | ----------------- |
| Audit         | `pnpm audit --audit-level high` | exit 0 at the end |
| Static checks | `pnpm run check`                | exit 0            |
| Tests / build | `pnpm test`, `pnpm build`       | exit 0            |

## Scope

**In scope**: `AGENTS.md` (only the hand-written part above `<!--VITE PLUS START-->`), `README.md`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `package.json` (only if a dep needs a catalog change), `vite.config.ts` (only to delete the `@ts-expect-error` line from plan 001 if it becomes unused).

**Out of scope**: source code, the `<!--VITE PLUS START-->…END-->` block in `AGENTS.md` (generated), `locales/`.

## Git workflow

Branch `advisor/007-docs-and-dev-deps`. Commits: `chore: bump dev dependencies`, `docs: update agents guide and readme`. Do not push.

## Steps

### Step 1: Clear dev advisories

1. `pnpm outdated` — bump `vite-plus`, `@commitlint/*`, `@fullstacksjs/oxlint-config` in the catalogs to their latest **non-major** versions first; `pnpm install`; `pnpm audit --audit-level high`.
2. For advisories still open, add exact patched versions under `overrides:` in `pnpm-workspace.yaml` (e.g. `tinypool: <first patched>`); `pnpm install`.
3. If `pnpm run check` now reports `Unused '@ts-expect-error' directive` in `vite.config.ts`, delete that line and its comment.

**Verify**: `pnpm audit --audit-level high` → exit 0. `pnpm run check && pnpm test && pnpm build` → all exit 0.

### Step 2: Check the bundle claim

```bash
D=$(mktemp -d) && cp -r dist/. "$D" && cd "$D" && BOT_TOKEN=bad DATABASE_URL=postgres://x node index.mjs; echo "exit $?"
```

Expected: the output contains `Invalid BOT_TOKEN` (all imports resolved without `node_modules`). If it instead says `Cannot find package`, the "node_modules must ship" gotcha is true — keep it and name the missing package.

### Step 3: Rewrite the stale `AGENTS.md` lines

Fix every bullet listed under "Current state", keeping the file's style (terse bullets). Add:

- Tests: `src/test/` harness — `createTestBot()` drives the real bot via `handleUpdate` with a fake Telegram API; DB tests `vi.mock("@/db/client", …)` onto PGlite (`src/test/db.ts`). Import test APIs from `vite-plus/test`.
- `sequentialize` (per chat) is the first middleware in `Bot` — handlers may assume no concurrent update for the same chat.
- Group writes go through `saveGroup` (`src/db/index.ts`); scope constants `PRIVATE` / `GROUP` / `ADMIN` in `src/lib/bot/scopes.ts`.
- Supergroup migration: `src/handlers/group/migrate.ts` moves rows on `migrate_to_chat_id`.

**Verify**: `grep -n "t3-oss\|zod\|migrate.ts\|parse-file-id\|dist/index.js\|no\*\* TypeScript" AGENTS.md` → only `handlers/group/migrate.ts` may match. `grep -c "VITE PLUS START" AGENTS.md` → 1.

### Step 4: README

Rewrite the command section as three tables — Private chat, Group chat (with text triggers 🤡/دلقک and 😇/ستون/آدم عاقل and custom gif/sticker triggers), Group admins — one row per command, descriptions in English. Self-host: `pnpm install`, copy `.env.example` → `.env`, `pnpm build`, `pnpm start` (migrations run automatically on startup). Mention privacy mode: text triggers need the bot to be an admin (as `/start` text says).

**Verify**: `for c in start privacy source stats clown unclown clownoftheday setgif removegif setsticker removesticker setunclowngif removeunclowngif setunclownsticker removeunclownsticker setcooldown resetstats; do grep -q "/$c" README.md || echo "missing $c"; done` → no output. `pnpm exec vp fmt --check README.md AGENTS.md` → exit 0.

## Test plan

No code tests; Step 1 runs the full suite after the dependency bump.

## Done criteria

- [ ] `pnpm audit --audit-level high` exit 0
- [ ] `pnpm run check`, `pnpm test`, `pnpm build` exit 0
- [ ] Step 3 and Step 4 verify commands produce the expected output
- [ ] Only in-scope files changed; `plans/README.md` row updated

## STOP conditions

- A bump requires a **major** version of `vite-plus` or `@fullstacksjs/oxlint-config` to clear an advisory — report the advisory and the required version instead of upgrading.
- After the bump, `pnpm run check` reports new lint errors in `src/` (new rules) — report the count instead of fixing source.

## Maintenance notes

- Consider Dependabot (`.github/dependabot.yml` for `npm` and `github-actions`) so advisories surface automatically; not done here to keep scope small.
