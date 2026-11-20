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

export type TriggerMedia = "animation" | "sticker";

export interface MessageMedia {
  key: string;
  fileId: string;
  media: TriggerMedia;
}

/** The gif/sticker a message carries, with its stable key; null for anything else. */
export function messageMedia(msg: { animation?: { file_id: string }; sticker?: { file_id: string } } | undefined) {
  const media: TriggerMedia | undefined = msg?.animation ? "animation" : msg?.sticker ? "sticker" : undefined;
  const fileId = media && msg?.[media]?.file_id;
  if (!media || !fileId) return null;
  return { key: mediaKey(fileId), fileId, media } satisfies MessageMedia;
}
