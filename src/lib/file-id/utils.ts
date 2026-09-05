import type { BinaryReader } from "@/lib/file-id/binary-reader";

export function posMod(a: number, b: number): number {
  const rest = a % b;
  return rest < 0 ? rest + Math.abs(b) : rest;
}

export function base64urlDecode(input: string): Buffer {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(base64 + padding, "base64");
}

export function rleDecode(binary: Uint8Array): Buffer {
  const base256: number[] = [];
  let last: number | null = null;

  for (const cur of binary) {
    if (last === 0) {
      for (let i = 0; i < cur; i += 1) {
        base256.push(0);
      }

      last = null;
    } else {
      if (last !== null) {
        base256.push(last);
      }

      last = cur;
    }
  }

  if (last !== null) {
    base256.push(last);
  }

  return Buffer.from(base256);
}

export function unpackTlString(reader: BinaryReader): Buffer {
  const length = reader.read(1).readUInt8(0);

  if (length > 254) {
    throw new Error("length too big for a single field");
  }

  let str: Buffer;
  let fill: number;

  if (length === 254) {
    const length3 = reader.read(3).readUIntLE(0, 3);
    fill = posMod(-length3, 4);
    str = reader.read(length3);
  } else {
    fill = posMod(-(length + 1), 4);
    str = reader.read(length);
  }

  reader.skip(fill);
  return str;
}

export function unpackNullTerminatedString(input: Buffer): Buffer {
  const chars: number[] = [];

  for (const byte of input) {
    if (byte === 0) break;
    chars.push(byte);
  }

  return Buffer.from(chars);
}

export function parseVersion(decoded: Buffer): { data: Buffer; version: number; subVersion: number } {
  const version = decoded.at(-1) ?? 0;
  let data = decoded.subarray(0, decoded.length - 1);
  let subVersion = 0;

  if (version === 4) {
    subVersion = data.at(-1) ?? 0;
    data = data.subarray(0, data.length - 1);
  }

  return { data, version, subVersion };
}
