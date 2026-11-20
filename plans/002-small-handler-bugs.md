# Plan 002: Fix six small user-facing bugs

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat b805c64..HEAD -- src/handlers/static/source.ts src/handlers/group/clown.ts src/handlers/group/stats.ts src/handlers/group/clownoftheday.ts src/handlers/admin/setcooldown.ts src/lib/config.ts src/lib/date.ts`
> Plan 001 only adds tests next to these files; any change to the files themselves is drift — compare with the excerpts below and STOP on mismatch.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/001-verification-baseline.md (test harness `createTestBot`, `groupMessage`, `user`, `resetDb` in `src/test/`)
- **Category**: bug
- **Planned at**: commit `b805c64`, 2026-11-20

## Why this matters

Six independent bugs, each a few lines:

1. `/source` replies with the `/start` text, so users never see the repo link.
2. In forum (topic) groups, sending `🤡` **without** replying clowns the topic's creator, because Telegram sets `reply_to_message` to the topic-created service message for every message in a topic.
3. `/stats` has no row limit; once a group has ~80–100 distinct clowns the message exceeds Telegram's 4096-char limit and `/stats` fails permanently for that group.
4. `/setcooldown ۱۰` (Persian digits — the bot's users write Persian) is rejected as invalid; `Number()` also accepts odd inputs like `1e1` and `0x10`.
5. `BOT_TOKEN` validation requires exactly 46 chars and a 10-digit bot id; valid tokens with a different-length id are rejected at startup.
6. Dates in `/stats` and the clown-of-the-day "once per day" check use the **server's** timezone, not the users' (Iran, `Asia/Tehran`).

## Current state

- `src/handlers/static/source.ts:8-13` — wrong i18n key:
  ```ts
  handler: async (ctx) => {
    return await ctx.reply(ctx.t("cmd_start"), {
      link_preview_options: { is_disabled: true },
      ...(ctx.msg ? { reply_parameters: { message_id: ctx.msg.message_id, chat_id: ctx.msg.chat.id } } : {}),
    });
  },
  ```
  `locales/fa.ftl` defines `cmd_source` (lines 34–40) containing `https://github.com/haashemi/clown-counter-bot`.
- `src/handlers/group/clown.ts:27-41`:
  ```ts
  function getData(ctx: BotContext): Data | null {
    if (!ctx.message) return null;

    const voter = ctx.message.from;
    const clown = ctx.message.reply_to_message?.from;

    if (!clown || !voter) return null;
    ...
  ```
- `src/handlers/group/stats.ts:24-33` — query without limit:
  ```ts
  const clowns = await db
    .select({
      name: schema.users.name,
      count: sql<number>`coalesce(sum(${schema.clownVotes.quantity}), 0)::int`,
    })
    .from(schema.clownVotes)
    .leftJoin(schema.users, eq(schema.users.id, schema.clownVotes.clownId))
    .groupBy(schema.users.id)
    .where(and(...conditions))
    .orderBy(desc(sql`coalesce(sum(${schema.clownVotes.quantity}), 0)`));
  ```
- `src/handlers/admin/setcooldown.ts:13-27`:
  ```ts
  const args = msg.text?.split(/\s+/).slice(1).join(" ").trim();
  if (!args) { ...usage... }
  const minutes = Number(args);
  if (Number.isNaN(minutes) || !Number.isInteger(minutes)) { ...invalid_number... }
  ```
- `src/lib/config.ts:26-28`:
  ```ts
  if (!config.BOT_TOKEN || config.BOT_TOKEN.length !== 46 || !/^\d{10}:.+/.test(config.BOT_TOKEN)) {
    throw new Error("Invalid BOT_TOKEN: expected 46 chars matching /^\\d{10}:.+/");
  }
  ```
- `src/lib/date.ts` (whole file):
  ```ts
  const dateFormatter = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" });

  export function localizeDate(d: Date): string {
    return dateFormatter.format(d);
  }
  ```
- `src/handlers/group/clownoftheday.ts:17-20`:
  ```ts
  // Once per group per day: blocks if the latest system vote (voterId IS NULL)
  // falls on the same calendar day as now (server's local timezone).
  const sameDay = (d: Date, now = new Date()) =>
    d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  ```
  Line 34 comment says `// Candidates: users who ever appeared in this group's clown_votes (as voter or clown).` but the query joins only `clownId` — the comment is wrong.
- Conventions: path-alias imports (`@/lib/date`), `import type` first, Persian strings only in `locales/fa.ftl`. No new i18n keys are needed by this plan.

## Commands you will need

| Purpose       | Command          | Expected |
| ------------- | ---------------- | -------- |
| Static checks | `pnpm run check` | exit 0   |
| Tests         | `pnpm test`      | all pass |

## Scope

**In scope**: `src/handlers/static/source.ts`, `src/handlers/group/clown.ts`, `src/handlers/group/stats.ts`, `src/handlers/group/clownoftheday.ts`, `src/handlers/admin/setcooldown.ts`, `src/lib/config.ts`, `src/lib/date.ts`, and test files `src/handlers/**/*.test.ts`, `src/lib/date.test.ts`, `src/lib/config.test.ts` (create as needed).

**Out of scope**: cooldown race conditions (plan 004), reply-boilerplate cleanup (plan 006), `locales/fa.ftl`, any DB schema change.

## Git workflow

Branch `advisor/002-small-handler-bugs`. One Conventional Commit per bug, e.g. `fix: send the source text on /source`. Do not push.

## Steps

### Step 1: `/source` sends `cmd_source`

Change `ctx.t("cmd_start")` to `ctx.t("cmd_source")` in `source.ts`. Keep `link_preview_options`.
Add a test (new `src/handlers/static/static.test.ts`, private chat update with `chatType: "private"`, positive `chatId`, text `/source`): the reply contains `github.com/haashemi/clown-counter-bot`.
**Verify**: `pnpm test src/handlers/static` → pass.

### Step 2: Ignore topic-creation service messages as reply targets

In `getData` (`clown.ts`):

```ts
const replied = ctx.message.reply_to_message;
// In forum topics every message "replies" to the topic-created service message.
const clown = replied?.forum_topic_created ? undefined : replied?.from;
```

Test in `clown.test.ts`: `🤡` whose `replyTo` is a message with `forum_topic_created: { name: "t", icon_color: 0 }` and `from: Bob` → 0 rows, 0 replies.
**Verify**: `pnpm test src/handlers/group/clown.test.ts` → pass.

### Step 3: Cap `/stats` at 30 rows

Add `const STATS_LIMIT = 30;` at the top of `stats.ts` and `.limit(STATS_LIMIT)` after `.orderBy(...)`.
Test: insert 35 distinct clowned users → reply contains exactly 30 lines that contain the `cmd_stats_group_clown` marker (count lines containing `— `).
**Verify**: `pnpm test src/handlers/group/stats.test.ts` → pass.

### Step 4: Accept Persian/Arabic digits in `/setcooldown`; reject non-digits

Replace the `Number(args)` + `isNaN/isInteger` check with:

```ts
const digits = args.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0)).replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
if (!/^\d+$/.test(digits)) { ...existing invalid_number reply... }
const minutes = Number(digits);
```

Tests in `admin.test.ts`: admin `/setcooldown ۱۰` → `cooldown === 600000`; `/setcooldown ٥` → `300000`; `/setcooldown 1e1` → no cooldown stored.
**Verify**: `pnpm test src/handlers/admin` → pass.

### Step 5: Relax BOT_TOKEN validation

Replace the condition with `!/^\d+:[\w-]+$/.test(config.BOT_TOKEN)` and the message with `"Invalid BOT_TOKEN: expected <bot id>:<secret> from @BotFather"`.
No unit test needed (module runs at import with top-level await); verify by grep.
**Verify**: `grep -n "length !== 46" src/lib/config.ts` → no match; `pnpm run check` → exit 0.

### Step 6: Use the users' timezone (`Asia/Tehran`)

In `src/lib/date.ts`:

```ts
export const TIME_ZONE = "Asia/Tehran";

const dateFormatter = new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: TIME_ZONE,
});
const dayFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }); // YYYY-MM-DD

export function localizeDate(d: Date): string {
  return dateFormatter.format(d);
}

/** `true` when both instants fall on the same calendar day in TIME_ZONE. */
export function isSameDay(a: Date, b: Date): boolean {
  return dayFormatter.format(a) === dayFormatter.format(b);
}
```

In `clownoftheday.ts` delete the local `sameDay` and its comment, import `isSameDay` from `@/lib/date`, use `isSameDay(recent.votedAt, new Date())`, and fix the line-34 comment to `// Candidates: users who were clowned in this group at least once.`
Create `src/lib/date.test.ts`: `isSameDay(new Date("2026-03-01T20:00:00Z"), new Date("2026-03-01T21:00:00Z"))` → `false` (Tehran is UTC+3:30, so 20:00Z is 23:30 and 21:00Z is 00:30 the next day); `isSameDay(new Date("2026-03-01T10:00:00Z"), new Date("2026-03-01T12:00:00Z"))` → `true`.
**Verify**: `pnpm test src/lib/date.test.ts` → 2 pass.

## Test plan

New tests listed per step (≥ 8). Pattern: the tests created by plan 001 in `src/handlers/group/clown.test.ts`.

## Done criteria

- [ ] `pnpm run check` exit 0; `pnpm test` exit 0
- [ ] `grep -n 'cmd_start' src/handlers/static/source.ts` → no match
- [ ] `grep -n 'forum_topic_created' src/handlers/group/clown.ts` → 1 match
- [ ] `grep -n 'STATS_LIMIT' src/handlers/group/stats.ts` → 2 matches
- [ ] `grep -n 'getDate()' src/handlers/group/clownoftheday.ts` → no match
- [ ] Only in-scope files changed; `plans/README.md` row updated

## STOP conditions

- Plan 001's harness (`src/test/bot.ts`) does not exist.
- The `forum_topic_created` property is not in grammY's `Message` type (`grep -n forum_topic_created node_modules/.pnpm/@grammyjs+types*/node_modules/@grammyjs/types/message.d.ts` empty).
- `Intl.DateTimeFormat` with `timeZone: "Asia/Tehran"` throws (Node built without full ICU) — report instead of hardcoding offsets.

## Maintenance notes

- If the bot ever serves non-Iranian groups, `TIME_ZONE` becomes a per-group setting; until then a constant is correct (no config for fixed values).
- `STATS_LIMIT = 30` keeps messages ~1.5–2k chars; if names get long, lower it rather than paginating.
