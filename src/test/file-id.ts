interface EncodeOptions {
  typeId: number;
  dcId?: number;
  id: bigint;
  accessHash?: bigint;
  fileReference?: Buffer;
  version?: number;
  subVersion?: number;
}

export function tlString(bytes: Buffer): Buffer {
  const header =
    bytes.length < 254
      ? Buffer.from([bytes.length])
      : Buffer.from([254, bytes.length & 0xff, (bytes.length >> 8) & 0xff, (bytes.length >> 16) & 0xff]);
  const raw = Buffer.concat([header, bytes]);
  return Buffer.concat([raw, Buffer.alloc((4 - (raw.length % 4)) % 4)]);
}

export function rleEncode(input: Buffer): Buffer {
  const out: number[] = [];
  let zeros = 0;

  const flush = () => {
    if (zeros > 0) out.push(0, zeros);
    zeros = 0;
  };

  for (const byte of input) {
    if (byte === 0) {
      zeros += 1;
      if (zeros === 255) flush();
    } else {
      flush();
      out.push(byte);
    }
  }
  flush();

  return Buffer.from(out);
}

/** Builds a Telegram Bot API file_id (test-only inverse of `mediaKey`). */
export function encodeFileId({
  typeId,
  dcId = 4,
  id,
  accessHash = 0n,
  fileReference,
  version = 4,
  subVersion = 0,
}: EncodeOptions): string {
  const head = Buffer.alloc(8);
  head.writeUInt32LE((typeId | (fileReference ? 1 << 25 : 0)) >>> 0, 0);
  head.writeUInt32LE(dcId, 4);

  const ids = Buffer.alloc(16);
  ids.writeBigInt64LE(id, 0);
  ids.writeBigInt64LE(accessHash, 8);

  const tail = version === 4 ? Buffer.from([subVersion, version]) : Buffer.from([version]);

  const parts = [head, ...(fileReference ? [tlString(fileReference)] : []), ids, tail];

  return rleEncode(Buffer.concat(parts)).toString("base64url");
}
