import { describe, expect, it } from "vite-plus/test";

import { encodeFileId, rleEncode, tlString } from "@/test/file-id";

import { mediaKey } from "./media-key";

const ids = [0n, 1n, -1n, 2n ** 63n - 1n, -(2n ** 63n), 0x00ff00ff00ff0000n];
const refSizes = [0, 1, 2, 3, 4, 253, 254, 255, 300, 1000];
const refs: { fileReference?: Buffer }[] = [
  {},
  ...refSizes.flatMap((n) => [{ fileReference: Buffer.alloc(n, 0) }, { fileReference: Buffer.alloc(n, 7) }]),
];

const payloads = ids.flatMap((id) => refs.map((ref) => ({ id, ...ref })));

const cases: { typeId: number; version: number; dcId: number; id: bigint; fileReference?: Buffer }[] = [];
for (const typeId of [8, 10])
  for (const version of [2, 4])
    for (const dcId of [1, 4]) for (const payload of payloads) cases.push({ typeId, version, dcId, ...payload });

describe(mediaKey, () => {
  it.each(cases)("round-trips type $typeId v$version dc$dcId id $id", (opts) => {
    const fileId = encodeFileId(opts);
    expect(mediaKey(fileId)).toBe(opts.id.toString());
  });

  it("returns 0 for a web-location file_id", () => {
    const head = Buffer.alloc(8);
    head.writeUInt32LE(10 | (1 << 24), 0);
    head.writeUInt32LE(4, 4);
    const accessHash = Buffer.alloc(8);
    accessHash.writeBigInt64LE(5n);
    const raw = Buffer.concat([head, tlString(Buffer.from("https://x")), accessHash, Buffer.from([2])]);
    const fileId = rleEncode(raw).toString("base64url");

    expect(mediaKey(fileId)).toBe("0");
  });
});
