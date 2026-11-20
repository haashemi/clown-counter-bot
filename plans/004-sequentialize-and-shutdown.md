# Plan 004: Serialize updates per chat and shut down cleanly

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat b805c64..HEAD -- src/lib/bot/index.ts src/index.ts src/db/index.ts src/db/client.ts src/handlers/group/clown.ts`
> Expected drift: plan 001 created `src/db/client.ts` and moved the pool there; plan 002 changed `getData` in `clown.ts`. Anything else: compare with the excerpts; STOP on mismatch.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/001-verification-baseline.md
- **Category**: bug
- **Planned at**: commit `b805c64`, 2026-11-20

## Why this matters

The bot uses `@grammyjs/runner`, which processes updates **concurrently**. Every "check, then write" in the handlers is therefore racy: two `🤡` messages from the same user arriving together both pass the cooldown check and both insert a vote (the code comment even claims "Race-free"); two `/clownoftheday` at once both pick a clown; two `/setgif` at once overwrite each other's list. The runner ships the standard fix, `sequentialize`, already installed: updates of the same chat run one after another, different chats stay parallel. Only one bot process can poll Telegram at a time, so in-process serialization is sufficient.

Separately, `run()` throws away the runner handle and never handles SIGINT/SIGTERM, so a restart cuts in-flight updates and never closes the PostgreSQL pool.

## Current state

- `src/lib/bot/index.ts:35-58`:
  ```ts
  constructor(token: string, { plugins }: BotOptions) {
    super(token);

    plugins.forEach((plugin) => this.use(plugin));
    this.use(this.commands);

    this.api.config.use(autoRetryPlugin());
  }
  ...
  async run() {
    await this.commands.setCommands(this);

    run(this, {
      runner: { fetch: { allowed_updates: ["message", "callback_query"] } },
    });
  }
  ```
  Imports at line 4: `import { run } from "@grammyjs/runner";`
- `@grammyjs/runner` exports `sequentialize<C>(constraint: (ctx: C) => string | string[] | undefined)` (`node_modules/@grammyjs/runner/out/sequentialize.d.ts:44`). `run()` returns a `RunnerHandle` with `stop(): Promise<void>` and `task(): Promise<void> | undefined`.
- `src/index.ts` (whole file):
  ```ts
  import { runMigrations } from "@/db";
  import { handlers } from "@/handlers";
  import { Bot, getLocalesDirectory, i18nMiddleware, replyToMiddleware } from "@/lib/bot";
  import { config } from "@/lib/config";

  const bot = new Bot(config.BOT_TOKEN, {
    plugins: [i18nMiddleware(await getLocalesDirectory()), replyToMiddleware],
  });

  bot.registerHandlers(...handlers);

  await runMigrations();

  await bot.run();
  ```
- After plan 001, `src/db/client.ts` holds `const pool = new Pool(...)` and `export const db = drizzle(...)`; `src/db/index.ts` re-exports `db`.
- `src/handlers/group/clown.ts:43` comment: `/** Race-free cooldown check: returns the wait in minutes, or 0 when allowed. */` — false today.

## Commands you will need

| Purpose       | Command          | Expected |
| ------------- | ---------------- | -------- |
| Static checks | `pnpm run check` | exit 0   |
| Tests         | `pnpm test`      | all pass |
| Build         | `pnpm build`     | exit 0   |

## Scope

**In scope**: `src/lib/bot/index.ts`, `src/index.ts`, `src/db/client.ts`, `src/db/index.ts`, `src/handlers/group/clown.ts` (comment only), new `src/lib/bot/concurrency.test.ts`.

**Out of scope**: DB-level locking or unique constraints (not needed with one process), handler logic.

## Git workflow

Branch `advisor/004-sequentialize-and-shutdown`. Commits: `fix: process updates of one chat sequentially`, `feat: stop the runner and close the pool on shutdown`. Do not push.

## Steps

### Step 1: Add `sequentialize` as the first middleware

In `src/lib/bot/index.ts`: `import { run, sequentialize } from "@grammyjs/runner";` and make the first line after `super(token);`:

```ts
// Updates of one chat run one at a time (no check-then-write races); other chats stay concurrent.
this.use(sequentialize((ctx) => ctx.chat?.id.toString()));
```

In `clown.ts` change the line-43 comment to `/** Cooldown check (races prevented by \`sequentialize\` in \`Bot\`): returns the wait in minutes, or 0 when allowed. */`.

Create `src/lib/bot/concurrency.test.ts` (plan 001 harness):

- Alice sends two `🤡` replies to Bob concurrently: `await Promise.all([send(u1), send(u2)])` → exactly 1 vote row.
- Two concurrent `/clownoftheday` (with Bob clowned once beforehand) → exactly 1 row with `voterId: null`.

**Verify**: `pnpm test src/lib/bot/concurrency.test.ts` → 2 pass; run 5 times, all pass.

### Step 2: Graceful shutdown

1. `src/db/client.ts`: export the pool closer: `export const closeDb = () => pool.end();` and re-export `closeDb` from `src/db/index.ts`.
2. `Bot.run()`:
   ```ts
   /** Starts polling and resolves after SIGINT/SIGTERM has stopped the runner. */
   async run() {
     await this.commands.setCommands(this);

     const runner = run(this, { runner: { fetch: { allowed_updates: ["message", "callback_query"] } } });

     const stop = () => void runner.stop();
     process.once("SIGINT", stop);
     process.once("SIGTERM", stop);

     await runner.task();
   }
   ```
3. `src/index.ts`: import `closeDb` from `@/db`; after `await bot.run();` add `await closeDb();`.

**Verify**: `pnpm run check` → exit 0; `pnpm build` → exit 0; `pnpm test` → all pass.

## Test plan

Step 1 concurrency tests (they may also pass without the fix on a fast machine; they must pass with it). Shutdown is verified by code review + build (no test: it needs a live Telegram connection).

## Done criteria

- [ ] `grep -n "sequentialize" src/lib/bot/index.ts` → 2 matches
- [ ] `grep -n "Race-free" src` → no matches
- [ ] `grep -n "SIGTERM" src/lib/bot/index.ts` → 1 match; `grep -n closeDb src/index.ts` → 2 matches
- [ ] `pnpm run check`, `pnpm test`, `pnpm build` all exit 0
- [ ] Only in-scope files changed; `plans/README.md` row updated

## STOP conditions

- `runner.task()` is not a method on the installed runner version (`grep -n "task:" node_modules/@grammyjs/runner/out/runner.d.ts` empty).
- The concurrency tests fail with `sequentialize` installed.
- Anything suggests the bot runs as several processes/replicas (e.g. a Dockerfile/compose with `replicas`) — then in-process locking is insufficient; report.

## Maintenance notes

- Any future per-user cross-chat state (e.g. a private-chat `/me` that writes) would need a constraint keyed by user too: `sequentialize` accepts `string[]`.
- `sequentialize` must stay the first middleware so every handler is covered.
