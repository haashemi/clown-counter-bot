# AGENTS.md

ClownCounterBot: a deliberately simple Telegram bot (TypeScript + GrammyJS) that counts "clowns" in group chats. Keep it simple — prefer Node stdlib and ES features over adding dependencies, and it must run comfortably on weak hardware.

## Stack

- Node 22, TypeScript, package manager is **pnpm** (never plain `npm`).
- Bot: `grammy` + `@grammyjs/{commands,i18n,runner,auto-retry}`.
- DB: SQLite via `drizzle-orm` + `@libsql/client`.
- Env: `@t3-oss/env-core` + `zod`.

## Commands

- `pnpm dev` — run TS directly from `src/index.ts` via `vite-node -w` (watch mode). `.env` is loaded by `src/lib/config.ts`, not a node flag.
- `pnpm build` — `vp pack` bundles everything into one `dist/index.js` (alwaysBundle; only Node built-ins external, target node22) and copies `drizzle/` and `locales/` into `dist/` via the `pack.copy` block.
- `pnpm start` — run the built `dist/index.js` file.
- `pnpm archive` — zip all `dist/` content plus `.env.example` into `dist.zip` (requires the `zip` CLI).
- `pnpm lint` — `vp lint --fix`.
- `pnpm check` — `vp check` (format + lint + typecheck).
- DB: schema changes → `pnpm db:generate` → `pnpm db:migrate` (migrations in `drizzle/`). Migrations also run automatically at startup via `src/db/migrate.ts` (`runMigrations`, called from `src/index.ts` _before_ `setCommands`), so a fresh DB is migrated without a manual step.
- `pnpm prepare` — install the vite-plus git-hook dispatcher (`vp hooks enable`, one-time setup).

## Conventions (must-follow)

- Import via path aliases: `@/lib/*` → `src/lib/*`, `@/db` → `src/db/index.ts`, `@/db/*` → `src/db/*`. Never relative imports.
- i18n strings live in `locales/fa.ftl` (Fluent), default locale `fa`. Access via `ctx.t("key", { vars })`. Always add the key when adding user-facing text.
- Bot must be constructed as `new Bot(config.BOT_TOKEN)` from `@/lib/bot` (BotContext = Context & I18nFlavor). The bot runner is set up in `src/index.ts` (filters group/supergroup messages, `isClownCall` middleware).
- Commands use `@grammyjs/commands` `Command`/`CommandGroup`, registered in `src/commands/index.ts`. Each command is a `new Command<BotContext>("name", "fa desc").addToScope(...)` in its own file.

## Config & env

- `.env` is required at runtime, loaded from CWD by `src/lib/config.ts` (`process.loadEnvFile`) — real env vars take precedence. `BOT_TOKEN` (46 chars, `^\d{10}:.+`) and `DB_FILE_PATH` (must start with `file:`, e.g. `file:database.sqlite`) are zod-validated at startup. Copy `.env.example`.
- `.env*` is gitignored (except `.env.example`).

## DB schema

- Tables in `src/db/schema/tables.ts` (`users`, `groups`, `clownVotes`), relations in `relations.ts`.
- The libsql client is created in `src/db/index.ts`; export `db` and `schema` from `@/db`.
- Schema changes: edit tables → `pnpm db:generate` → `pnpm db:migrate` (migrations in `drizzle/`). `casing: "snake_case"` is enforced in both drizzle and the db client.

## Git / commit

- Conventional Commits enforced on commit (`commitlint`); the vite-plus hook dispatcher (`vp hooks`, installed by `pnpm prepare`) runs the project hooks in `.vite-hooks/` — `pre-commit` runs `vp staged` (staged-file checks from the `staged` block in `vite.config.ts`), `commit-msg` runs `commitlint`. Stage only intended files.

## Gotchas

- The single-file bundle (`pnpm build`) keeps the `libsql` family external (see `pack.deps.alwaysBundle` in `vite.config.ts`) — its native binding (`@libsql/linux-x64-gnu` etc.) can't be inlined, so `node_modules` must ship with the deployment.
- `drizzle-kit generate` writes a migration snapshot into `drizzle/`; review it.
- `groups.gifIds` / `stickerIds` store JSON arrays of numeric file-id (parse via `parseFileId(...).id.toString()`), not raw Telegram file_ids — see `src/lib/parse-file-id.ts` and `src/lib/utils.ts`.
- `isClownCall` triggers on literal `🤡` / `دلقک` text OR a group-configured gif/sticker.
- Cooldown stored in ms on `groups.cooldown`; default 10 min in `src/commands/clown/handler.ts`.

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
