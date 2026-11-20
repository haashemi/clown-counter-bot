# Plan 005: Replace the 378-line file_id parser with a ~40-line key extractor

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat b805c64..HEAD -- src/lib/file-id src/handlers/admin/media.ts src/handlers/group/clown-filter.ts`
> Expected drift: plan 003 turned `isClownCall` in `clown-filter.ts` into a predicate (the `parseFileId` call at the end of `matchMediaCall` is unchanged). Anything else in these paths: compare with excerpts; STOP on mismatch.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED (must produce byte-identical keys to what is stored in the DB)
- **Depends on**: plans/001-verification-baseline.md (`src/test/file-id.ts` `encodeFileId`, test harness)
- **Category**: tech-debt
- **Planned at**: commit `b805c64`, 2026-11-20

## Why this matters

Groups can register custom gifs/stickers that count as a 🤡 vote. To recognise "the same gif" across re-sends, the bot decodes Telegram's binary `file_id` and stores the decoded 64-bit document `id` as a decimal string in `groups.gif_ids` / `sticker_ids` / `unclown_gif_ids` / `unclown_sticker_ids` (jsonb string arrays). The maintainer confirmed Telegram's `file_unique_id` did **not** work for this in practice, so the decoding stays.

But the bot only ever reads `.id` from the parse result, and only for animations and stickers. The current implementation is a full port of a general parser (photo sizes, web locations, owner ids, 5 files, 378 lines, untested). Everything after the `id` field is dead weight. A ~40-line extractor that reads only up to `id` is easier to verify and maintain. Its output **must** equal the old `parseFileId(raw).id.toString()` for every animation/sticker file_id, or existing groups lose their configured media.

## Current state

- `src/lib/file-id/` — `index.ts` (88 lines, `parseFileId`), `binary-reader.ts`, `constants.ts`, `parsers.ts`, `types.ts`, `utils.ts`. Total 378 lines.
- The only callers (all use `.id.toString()`):
  - `src/handlers/admin/media.ts:54` — `const updated = [...existing, parseFileId(rawFileId).id.toString()];`
  - `src/handlers/admin/media.ts:82` — `const fileId = parseFileId(rawFileId).id.toString();`
  - `src/handlers/group/clown-filter.ts:38` — `return matchMedia(group, parseFileId(fileId).id.toString());`
  - plan-001 tests: `src/test/file-id.test.ts`, `src/handlers/group/clown.test.ts` (and possibly `admin.test.ts`).
- Decoding path the old code takes for a document (animation `typeId` 10, sticker 8), from `src/lib/file-id/index.ts:8-44` and `utils.ts`:
  1. base64url-decode the string (`utils.ts:8-12`, adds padding then `Buffer.from(.., "base64")`).
  2. RLE-decode (`utils.ts:14-39`): a `0` byte followed by `n` expands to `n` zero bytes; a trailing lone `0` stays a single `0`.
  3. Strip version bytes from the **end** (irrelevant for reading from the start).
  4. `uint32LE` raw type id at offset 0; flags `FILE_REFERENCE = 1 << 25`, `WEB_LOCATION = 1 << 24`.
  5. `uint32LE` dc id at offset 4.
  6. If FILE_REFERENCE flag: skip a TL string (`utils.ts:41-62`): first byte `L`; `L > 254` throws `"length too big for a single field"`; `L === 254` → 3-byte LE length `n` follows, total consumed `4 + n` rounded up to a multiple of 4; else total consumed `1 + L` rounded up to a multiple of 4.
  7. If WEB_LOCATION flag: return id `0n` (`index.ts:23-41`).
  8. Read **signed** `int64LE` → `id` (`index.ts:44`, `reader.readBigInt64LE()`). Stored strings can be negative.
- Node's `Buffer.from(str, "base64url")` natively decodes unpadded base64url.
- Conventions: path aliases (`@/lib/media-key`), no relative imports across folders; `/* eslint-disable no-bitwise */` was needed in the old code for `&`/`<<` — keep a scoped disable only if lint requires it.

## Commands you will need

| Purpose       | Command          | Expected |
| ------------- | ---------------- | -------- |
| Static checks | `pnpm run check` | exit 0   |
| Tests         | `pnpm test`      | all pass |

## Scope

**In scope**: `src/lib/media-key.ts` (create), `src/lib/media-key.test.ts` (create), `src/lib/file-id/` (delete in Step 4), `src/handlers/admin/media.ts` (import + 2 call sites only), `src/handlers/group/clown-filter.ts` (import + 1 call site only), test files that import `parseFileId`.

**Out of scope**: the stored data format (do not migrate DB rows), `src/test/file-id.ts` encoder (keep), any other refactor of `media.ts` (plan 006).

## Git workflow

Branch `advisor/005-slim-file-id-parser`. Commits: `refactor: add media key extractor`, `refactor: drop the full file_id parser`. Do not push.

## Steps

### Step 1: Write `src/lib/media-key.ts`

```ts
/* eslint-disable no-bitwise */
const WEB_LOCATION_FLAG = 1 << 24;
const FILE_REFERENCE_FLAG = 1 << 25;

/** Telegram file_id RLE: a 0 byte followed by n stands for n zero bytes. */
function rleDecode(input: Buffer): Buffer {
  const out: number[] = [];
  for (let i = 0; i < input.length; i += 1) {
    const byte = input[i]!;
    const count = input[i + 1];
    if (byte !== 0) out.push(byte);
    else if (count === undefined) out.push(0);
    else {
      for (let k = 0; k < count; k += 1) out.push(0);
      i += 1;
    }
  }
  return Buffer.from(out);
}

/** Bytes taken by a TL-serialized string at `pos`, padding included. */
function tlStringSize(data: Buffer, pos: number): number {
  const len = data.readUInt8(pos);
  if (len > 254) throw new Error("length too big for a single field");
  const [header, size] = len === 254 ? [4, data.readUIntLE(pos + 1, 3)] : [1, len];
  return Math.ceil((header + size) / 4) * 4;
}

/**
 * Stable key for a gif/sticker: the document id inside its Bot API file_id, as a signed decimal string.
 * (file_unique_id did not match re-sent media in practice.) Stored in groups.*_ids.
 */
export function mediaKey(fileId: string): string {
  const data = rleDecode(Buffer.from(fileId, "base64url"));
  const typeId = data.readUInt32LE(0);
  let pos = 8; // type id + dc id
  if (typeId & FILE_REFERENCE_FLAG) pos += tlStringSize(data, pos);
  if (typeId & WEB_LOCATION_FLAG) return "0";
  return data.readBigInt64LE(pos).toString();
}
```

**Verify**: `pnpm run check` → exit 0.

### Step 2: Differential test against the old parser

Create `src/lib/media-key.test.ts`. Using `encodeFileId` from `@/test/file-id`, build every combination of:

- `typeId`: 8, 10
- `version`: 2, 4
- `dcId`: 1, 4
- `id`: `0n`, `1n`, `-1n`, `2n ** 63n - 1n`, `-(2n ** 63n)`, `0x00ff00ff00ff0000n`
- `fileReference`: `undefined`, and `Buffer.alloc(n, 0)` and `Buffer.alloc(n, 7)` for n in 0, 1, 2, 3, 4, 253, 254, 255, 300, 1000

For each: `expect(mediaKey(f)).toBe(parseFileId(f).id.toString())` **and** `expect(mediaKey(f)).toBe(id.toString())`. Also: a type id with the web-location flag returns `"0"` from both (build the buffer by hand: `uint32LE(10 | 1 << 24)`, `uint32LE(4)`, TL string `"https://x"`, `int64LE(5n)`, version byte `2`, RLE-encode as in the encoder).

**Verify**: `pnpm test src/lib/media-key.test.ts` → all pass (≥ 480 assertions across `it.each` cases).

### Step 3: Switch callers

Replace `parseFileId(x).id.toString()` with `mediaKey(x)` at the three call sites and in plan-001 tests; change imports to `import { mediaKey } from "@/lib/media-key";`.

**Verify**: `grep -rn "parseFileId" src --include=*.ts | grep -v "media-key.test.ts\|src/lib/file-id/"` → no matches. `pnpm test` → all pass.

### Step 4: Delete the old parser

Delete `src/lib/file-id/`. In `media-key.test.ts`, remove the `parseFileId` import and the first `expect` (keep the `id.toString()` comparison and the web-location case with expected `"0"`). Change `src/test/file-id.test.ts` (plan 001) to assert with `mediaKey` instead of `parseFileId`, or delete it if `media-key.test.ts` already covers the same cases.

**Verify**: `test ! -d src/lib/file-id && echo gone` → `gone`. `pnpm run check` → exit 0. `pnpm test` → all pass. `pnpm build` → exit 0.

## Test plan

Step 2's differential sweep is the safety net; Step 4 keeps it as a self-validating round-trip test. Plan-001 gif/sticker clown tests are the integration check.

## Done criteria

- [ ] `src/lib/file-id/` does not exist; `src/lib/media-key.ts` ≤ 50 lines (`wc -l`)
- [ ] `grep -rn parseFileId src` → no matches
- [ ] Differential test passed at Step 2 (paste the run summary into the commit message body)
- [ ] `pnpm run check`, `pnpm test`, `pnpm build` exit 0
- [ ] Only in-scope files changed; `plans/README.md` row updated

## STOP conditions

- Any differential case in Step 2 disagrees. Do not "fix" the old parser or adjust the test — report the failing input.
- `Buffer.from(.., "base64url")` decodes differently from the old base64urlDecode for any case.
- A caller turns out to use a field other than `.id` (e.g. `typeDetailed`, `ownerId`).

## Maintenance notes

- Stored ids are signed decimal strings of the document id. Changing to unsigned or to `file_unique_id` would orphan every configured gif/sticker — that needs a data migration.
- If Telegram changes the file_id layout before `id`, the round-trip tests will not catch it (they use our own encoder); a real file_id fixture captured from production would.
