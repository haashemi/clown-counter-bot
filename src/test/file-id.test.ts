import { describe, expect, it } from "vite-plus/test";

import { parseFileId } from "@/lib/file-id";

import { encodeFileId } from "./file-id";

const ids = [1n, -1n, 0x0123456789abcdefn];
const references: [string, { fileReference?: Buffer }][] = [
  ["no reference", {}],
  ["empty reference", { fileReference: Buffer.alloc(0) }],
  ["3-byte reference", { fileReference: Buffer.alloc(3, 7) }],
  ["253-byte reference", { fileReference: Buffer.alloc(253, 7) }],
  ["300-byte reference", { fileReference: Buffer.alloc(300, 7) }],
];

const cases = ids.flatMap((id) => references.map(([name, ref]) => [id, name, ref] as const));

describe(encodeFileId, () => {
  it.each(cases)("round-trips id %s with %s", (id, _name, ref) => {
    expect(parseFileId(encodeFileId({ typeId: 10, id, ...ref })).id).toBe(id);
  });
});
