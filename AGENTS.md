# AGENTS.md

ClownCounterBot: a deliberately simple Telegram bot (TypeScript + GrammyJS) that counts "clowns" in group chats. Keep it simple — prefer Node stdlib and ES features over adding dependencies, and it must run comfortably on weak hardware.

## Stack

- Node 22, TypeScript, package manager is **vpr** (never plain `npm`).
- Bot: `grammy` + `@grammyjs/{commands,i18n,runner,auto-retry}`.
- DB: PostgreSQL via `drizzle-orm` + `pg` (node-postgres pool, `max: 5`).
- Env: no library — `src/lib/config.ts` uses `process.loadEnvFile` + regex checks.
- Tests: Vitest via `vite-plus/test` (import test APIs from there).

## Commands

- `vpr dev` — run TS directly from `src/index.ts` via `vite-node -w` (watch mode). `.env` is loaded by `src/lib/config.ts`, not a node flag.
- `vpr build` — `vp pack` bundles everything into one `dist/index.mjs` (alwaysBundle; only Node built-ins external, target node22) and copies `drizzle/` and `locales/` into `dist/` via the `pack.copy` block.
- `vpr start` — run the built `dist/index.mjs` file.
- `vpr archive` — zip all `dist/` content plus `.env.example` into `dist.zip` (requires the `zip` CLI).
- `vpr lint` — `vp lint --fix`.
- `vpr check` — `vp check` (format + lint + typecheck).
- DB: schema changes → `vpr db:generate` → `vpr db:migrate` (migrations in `drizzle/`). Migrations also run automatically at startup via `runMigrations` in `src/db/index.ts` (called from `src/index.ts` _before_ `setCommands`), so a fresh DB is migrated without a manual step.
- `vpr prepare` — install the vite-plus git-hook dispatcher (`vp hooks enable`, one-time setup).

## Conventions (must-follow)

- Import via path aliases: `@/lib/*` → `src/lib/*`, `@/db` → `src/db/index.ts`, `@/db/*` → `src/db/*`, `@/handlers` → `src/handlers/index.ts`, `@/handlers/*` → `src/handlers/*`. Never relative imports.
- i18n strings live in `locales/fa.ftl` (Fluent), default locale `fa`. Access via `ctx.t("key", { vars })`. Always add the key when adding user-facing text.
- Bot must be constructed as `new Bot(config.BOT_TOKEN, { plugins })` from `@/lib/bot` (BotContext = Context & I18nFlavor & ReplyToFlavor). The bot runner is set up in `Bot.run()` and `src/index.ts` only wires plugins + `bot.registerHandlers(...handlers)`.
- Handlers live in `src/handlers/` (one file per feature, grouped by `static/`, `group/`, `admin/`) as a `Handler` discriminated union (`kind: "command" | "message" | "callback_query"`) defined in `src/handlers/index.ts`. Add new handlers to the `handlers` array there; `src/lib/bot/registration.ts` (`applyHandlers`) is the single place that turns them into grammY/`@grammyjs/commands` registrations. Command handlers carry `name`/`description`/`scopes`; a single `CommandGroup` is shared per bot (two groups would overwrite each other's `setMyCommands` scopes). `MessageHandler.filter` is a boolean predicate (false → falls through to later handlers); `inGroup` uses grammY `chatType`. `isClownCall` and the 🤡 flow live in `src/handlers/group/clown*.ts`; shared bot guards (e.g. `isAdmin`) in `src/lib/bot/filters/`.
- Command scopes: use `PRIVATE` / `GROUP` / `ADMIN` from `src/lib/bot/scopes.ts` (`GROUP` includes the admin scope: Telegram shows admins only the most specific list).
- Reply with `ctx.replyTo(msg, text, other?)` — it adds `reply_parameters`; never build them by hand.
- `sequentialize` (per chat) is the first middleware in `Bot` — handlers may assume no concurrent update for the same chat.
- Supergroup migration: `src/handlers/group/migrate.ts` moves the group, its votes and triggers on `migrate_to_chat_id`.

## Config & env

- `.env` is required at runtime, loaded from CWD by `src/lib/config.ts` (`process.loadEnvFile`) — real env vars take precedence. `BOT_TOKEN` (`^\d+:[\w-]+$`) and `DATABASE_URL` (must match `^postgres(ql)?://`) are validated at startup. Copy `.env.example`.
- `.env*` is gitignored (except `.env.example`).

## DB schema

- Tables in `src/db/schema/tables.ts` (`users`, `groups`, `clownVotes`, `groupTriggers`), relations in `relations.ts`.
- IDs are `bigint` (`mode: "number"`) — Telegram chat/user ids exceed int32. `clownVotes.id` is an identity column. Timestamps are `timestamptz`.
- The pg client is created in `src/db/client.ts`; `@/db` exports `db`, `schema`, `runMigrations` and `saveGroup`.
- All group writes go through `saveGroup(chatId, title, patch)` (`src/db/index.ts`) — it upserts and refreshes the stored name.
- Schema changes: edit tables → `vpr db:generate` → `vpr db:migrate` (migrations in `drizzle/`). `casing: "snake_case"` is enforced in both drizzle and the db client.
- Legacy SQLite → PostgreSQL data migration: `scripts/sqlite-to-psql.sh <sqlite.db> <postgres-url>` (target schema must exist first).

## Git / commit

- Conventional Commits enforced on commit (`commitlint`); the vite-plus hook dispatcher (`vp hooks`, installed by `vpr prepare`) runs the project hooks in `.vite-hooks/` — `pre-commit` runs `vp staged` (staged-file checks from the `staged` block in `vite.config.ts`), `commit-msg` runs `commitlint`. Stage only intended files.

## Gotchas

- The bundle (`vpr build`, `deps.alwaysBundle: [/.*/]`) is self-contained: `dist/` runs without `node_modules`.
- `drizzle-kit generate` writes a migration snapshot into `drizzle/`; review it.
- Gif/sticker triggers live in `group_triggers` (PK `group_id, key`; `key` = `mediaKey(file_id)`, a stable id — not the raw file_id, which changes). `file_id` is kept only to re-send the media in `/triggers`; rows migrated from the old jsonb columns have it null until the media is next seen by the clown filter. Managed by `/trigger` + `/triggers` in `src/handlers/admin/triggers.ts`; `/trigger`'s prompt replies to the media itself so its buttons' callback message carries the media in `reply_to_message`.
- `isClownCall` triggers on literal `🤡` / `دلقک` (clown) or `😇` / `ستون` / `آدم عاقل` (unclown) text, OR a gif/sticker in `group_triggers` (`src/handlers/group/clown-filter.ts`).
- Cooldown stored in ms on `groups.cooldown`; default 10 min in `src/handlers/group/clown.ts`.
- Verify with `pnpm test` (`vp test --run`) and `pnpm run check` (`vp check` = format + lint + typecheck).
- Test harness in `src/test/`: `createTestBot()` drives the real bot via `handleUpdate` with a fake Telegram API; DB tests `vi.mock("@/db/client", …)` onto PGlite (`src/test/db.ts`).

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->
