# AGENTS.md

ClownCounterBot: a deliberately simple Telegram bot (TypeScript + GrammyJS) that counts "clowns" in group chats. Keep it simple — prefer Node stdlib and ES features over adding dependencies, and it must run comfortably on weak hardware.

## Stack

- Node 22, TypeScript, package manager is **pnpm** (never plain `npm`).
- Bot: `grammy` + `@grammyjs/{commands,i18n,runner,auto-retry}`.
- DB: SQLite via `drizzle-orm` + `@libsql/client`.
- Env: `@t3-oss/env-core` + `zod`.

## Commands

- `pnpm dev` — run TS directly from `src/index.ts` (tsx, loads `.env`).
- `pnpm start` — run the built bundle from `dist/index.js`.
- `pnpm build` — `tsdown` bundles everything into one `dist/index.js` (alwaysBundle; only Node built-ins external, target node22).
- `pnpm lint` — `eslint . --fix`.
- DB: `pnpm db:generate` (after schema changes) → `pnpm db:migrate` → `pnpm start`.
- `pnpm prepare` — install git hooks + commit template (one-time setup).

## Conventions (must-follow)

- Import via path aliases: `@/lib/*` → `src/lib/*`, `@/db` → `src/db/index.ts`. Never relative imports.
- i18n strings live in `locales/fa.ftl` (Fluent), default locale `fa`. Access via `ctx.t("key", { vars })`. Always add the key when adding user-facing text.
- Bot must be constructed as `new Bot(config.BOT_TOKEN)` from `@/lib/bot` (BotContext = Context & I18nFlavor). The bot runner is set up in `src/index.ts` (filters group/supergroup messages, `isClownCall` middleware).
- Commands use `@grammyjs/commands` `Command`/`CommandGroup`, registered in `src/commands/index.ts`. Each command is a `new Command<BotContext>("name", "fa desc").addToScope(...)` in its own file.

## Config & env

- `.env` is required at runtime. `BOT_TOKEN` (46 chars, `^\d{10}:.+`) and `DB_FILE_PATH` (must start with `file:`, e.g. `file:database.sqlite`) are zod-validated at startup. Copy `.env.example`.
- `.env*` is gitignored (except `.env.example`).

## DB schema

- Tables in `src/db/schema/tables.ts` (`users`, `groups`, `clownVotes`), relations in `relations.ts`.
- The libsql client is created in `src/db/index.ts`; export `db` and `schema` from `@/db`.
- Schema changes: edit tables → `pnpm db:generate` → `pnpm db:migrate` (migrations in `drizzle/`). `casing: "snake_case"` is enforced in both drizzle and the db client.

## Git / commit

- Conventional Commits enforced on commit (`commitlint`); lint-staged runs eslint + prettier (printWidth 120) on staged files. Stage only intended files.

## Gotchas

- `drizzle-kit generate` writes a migration snapshot into `drizzle/`; review it.
- `groups.gifIds` / `stickerIds` store JSON arrays of numeric file-id (parse via `parseFileId(...).id.toString()`), not raw Telegram file_ids — see `src/lib/parse-file-id.ts` and `src/lib/utils.ts`.
- `isClownCall` triggers on literal `🤡` / `دلقک` text OR a group-configured gif/sticker.
- Cooldown stored in ms on `groups.cooldown`; default 10 min in `src/commands/clown/handler.ts`.
