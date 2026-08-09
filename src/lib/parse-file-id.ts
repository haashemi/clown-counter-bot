/* eslint-disable no-bitwise */

const TYPE_ID_WEB_LOCATION_FLAG = 1 << 24;
const TYPE_ID_FILE_REFERENCE_FLAG = 1 << 25;

export const TYPE_THUMBNAIL = 0;
export const TYPE_PROFILE_PHOTO = 1;
export const TYPE_PHOTO = 2;
export const TYPE_VOICE = 3;
export const TYPE_VIDEO = 4;
export const TYPE_DOCUMENT = 5;
export const TYPE_ENCRYPTED = 6;
export const TYPE_TEMP = 7;
export const TYPE_STICKER = 8;
export const TYPE_AUDIO = 9;
export const TYPE_ANIMATION = 10;
export const TYPE_ENCRYPTED_THUMBNAIL = 11;
export const TYPE_WALLPAPER = 12;
export const TYPE_VIDEO_NOTE = 13;
export const TYPE_SECURE_RAW = 14;
export const TYPE_SECURE = 15;
export const TYPE_BACKGROUND = 16;
export const TYPE_SIZE = 17;
export const TYPE_NONE = 18;

const PHOTOSIZE_SOURCE_LEGACY = 0;
const PHOTOSIZE_SOURCE_THUMBNAIL = 1;
const PHOTOSIZE_SOURCE_DIALOGPHOTO_SMALL = 2;
const PHOTOSIZE_SOURCE_DIALOGPHOTO_BIG = 3;
const PHOTOSIZE_SOURCE_STICKERSET_THUMBNAIL = 4;

const DOCUMENT_TYPES: Record<number, string> = {
  [TYPE_VOICE]: "voice",
  [TYPE_VIDEO]: "video",
  [TYPE_DOCUMENT]: "document",
  [TYPE_STICKER]: "sticker",
  [TYPE_AUDIO]: "song",
  [TYPE_ANIMATION]: "animation",
  [TYPE_VIDEO_NOTE]: "video note",
};

const PHOTO_TYPES: Record<number, string> = {
  [TYPE_THUMBNAIL]: "thumbnail",
  [TYPE_PROFILE_PHOTO]: "profile picture",
  [TYPE_PHOTO]: "photo",
};

function posMod(a: number, b: number): number {
  const rest = a % b;
  return rest < 0 ? rest + Math.abs(b) : rest;
}

function base64urlDecode(input: string): Buffer {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(base64 + padding, "base64");
}

function rleDecode(binary: Uint8Array): Buffer {
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

class BinaryReader {
  private readonly buffer: Buffer;
  private pos = 0;

  constructor(buffer: Buffer) {
    this.buffer = buffer;
  }

  get position(): number {
    return this.pos;
  }

  get length(): number {
    return this.buffer.length;
  }

  read(bytes: number): Buffer {
    const chunk = this.buffer.subarray(this.pos, this.pos + bytes);
    this.pos += bytes;
    return chunk;
  }

  skip(bytes: number): void {
    this.pos += bytes;
  }

  readUInt32LE(): number {
    const value = this.buffer.readUInt32LE(this.pos);
    this.pos += 4;
    return value;
  }

  readInt32LE(): number {
    const value = this.buffer.readInt32LE(this.pos);
    this.pos += 4;
    return value;
  }

  readBigInt64LE(): bigint {
    const value = this.buffer.readBigInt64LE(this.pos);
    this.pos += 8;
    return value;
  }
}

function unpackTlString(reader: BinaryReader): Buffer {
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

function unpackNullTerminatedString(input: Buffer): Buffer {
  const chars: number[] = [];

  for (const byte of input) {
    if (byte === 0) break;
    chars.push(byte);
  }

  return Buffer.from(chars);
}

function parseVersion(decoded: Buffer): { data: Buffer; version: number; subVersion: number } {
  const version = decoded.at(-1) ?? 0;
  let data = decoded.subarray(0, decoded.length - 1);
  let subVersion = 0;

  if (version === 4) {
    subVersion = data.at(-1) ?? 0;
    data = data.subarray(0, data.length - 1);
  }

  return { data, version, subVersion };
}

function normalizeTypeId(rawTypeId: number): { typeId: number; hasReference: boolean; hasWebLocation: boolean } {
  const hasReference = (rawTypeId & TYPE_ID_FILE_REFERENCE_FLAG) !== 0;
  const hasWebLocation = (rawTypeId & TYPE_ID_WEB_LOCATION_FLAG) !== 0;
  const typeId = rawTypeId & ~TYPE_ID_FILE_REFERENCE_FLAG & ~TYPE_ID_WEB_LOCATION_FLAG;
  return { typeId, hasReference, hasWebLocation };
}

function ownerId(id: bigint, typeId: number, version: number): bigint | null {
  if (!(version === 2 || version === 4) || typeId !== TYPE_STICKER) {
    return null;
  }

  return (id & (((1n << 24n) - 1n) << 32n)) / (1n << 32n);
}

interface BaseParsedFileId {
  fileId: string;
  typeId: number;
  hasReference: boolean;
  hasWebLocation: boolean;
  fileReference: Buffer | null;
  dcId: number;
  id: bigint;
  accessHash: bigint;
  version: number;
  subVersion: number;
}

export type PhotosizeSource =
  | { type: "dialogPhotoBig"; volumeId: bigint; locationLocalId: number; dialogId: bigint; dialogAccessHash: bigint }
  | { type: "dialogPhotoSmall"; volumeId: bigint; locationLocalId: number; dialogId: bigint; dialogAccessHash: bigint }
  | { type: "legacy"; volumeId: bigint; locationLocalId: number; secret: bigint }
  | {
      type: "stickersetThumbnail";
      volumeId: bigint;
      locationLocalId: number;
      stickerSetId: bigint;
      stickerSetAccessHash: bigint;
    }
  | { type: "thumbnail"; volumeId: bigint; locationLocalId: number; fileType: number; thumbnailType: string };

export interface WebLocationFileId extends BaseParsedFileId {
  kind: "webLocation";
  typeGeneric: "webLocation";
  typeDetailed: string;
  url: string;
}

export interface PhotoFileId extends BaseParsedFileId {
  kind: "photo";
  typeGeneric: "photo";
  typeDetailed: string;
  photosize: PhotosizeSource;
  ownerId: bigint | null;
}

export interface DocumentFileId extends BaseParsedFileId {
  kind: "document";
  typeGeneric: "document";
  typeDetailed: string;
  ownerId: bigint | null;
}

export type ParsedFileId = DocumentFileId | PhotoFileId | WebLocationFileId;

function parsePhotosize(reader: BinaryReader, source: number, volumeId: bigint): PhotosizeSource {
  if (source === PHOTOSIZE_SOURCE_DIALOGPHOTO_SMALL || source === PHOTOSIZE_SOURCE_DIALOGPHOTO_BIG) {
    const dialogId = reader.readBigInt64LE();
    const dialogAccessHash = reader.readBigInt64LE();
    const locationLocalId = reader.readInt32LE();
    return {
      type: source === PHOTOSIZE_SOURCE_DIALOGPHOTO_SMALL ? "dialogPhotoSmall" : "dialogPhotoBig",
      volumeId,
      dialogId,
      dialogAccessHash,
      locationLocalId,
    };
  }

  switch (source) {
    case PHOTOSIZE_SOURCE_LEGACY:
      return {
        type: "legacy",
        volumeId,
        secret: reader.readBigInt64LE(),
        locationLocalId: reader.readInt32LE(),
      };

    case PHOTOSIZE_SOURCE_THUMBNAIL:
      return {
        type: "thumbnail",
        volumeId,
        fileType: reader.readUInt32LE(),
        thumbnailType: unpackNullTerminatedString(reader.read(4)).toString("utf8"),
        locationLocalId: reader.readInt32LE(),
      };

    case PHOTOSIZE_SOURCE_STICKERSET_THUMBNAIL:
      return {
        type: "stickersetThumbnail",
        volumeId,
        stickerSetId: reader.readBigInt64LE(),
        stickerSetAccessHash: reader.readBigInt64LE(),
        locationLocalId: reader.readInt32LE(),
      };

    default:
      throw new Error(`Unknown photosize source: ${source}`);
  }
}

export function parseFileId(raw: string): ParsedFileId {
  const decoded = rleDecode(base64urlDecode(raw));
  const { data, version, subVersion } = parseVersion(decoded);
  const reader = new BinaryReader(data);

  const { typeId: normalizedTypeId, hasReference, hasWebLocation } = normalizeTypeId(reader.readUInt32LE());
  const typeId = normalizedTypeId;
  const dcId = reader.readUInt32LE();

  let fileReference: Buffer | null = null;

  if (hasReference) {
    fileReference = unpackTlString(reader);
  }

  if (hasWebLocation) {
    const url = unpackTlString(reader);
    const accessHash = reader.readBigInt64LE();
    return {
      kind: "webLocation",
      fileId: raw,
      typeId,
      hasReference,
      hasWebLocation,
      fileReference,
      url: url.toString("utf8"),
      dcId,
      id: 0n,
      accessHash,
      typeGeneric: "webLocation",
      typeDetailed: `webLocation(${typeId})`,
      version,
      subVersion,
    };
  }

  const id = reader.readBigInt64LE();
  const accessHash = reader.readBigInt64LE();

  const photoType = PHOTO_TYPES[typeId];

  if (photoType !== undefined) {
    const volumeId = reader.readBigInt64LE();
    const photosizeSource = version < 4 ? PHOTOSIZE_SOURCE_LEGACY : reader.readUInt32LE();
    const photosize = parsePhotosize(reader, photosizeSource, volumeId);
    return {
      kind: "photo",
      fileId: raw,
      typeId,
      hasReference,
      hasWebLocation,
      fileReference,
      dcId,
      id,
      accessHash,
      typeGeneric: "photo",
      typeDetailed: photoType,
      photosize,
      version,
      subVersion,
      ownerId: ownerId(id, typeId, version),
    };
  }

  return {
    kind: "document",
    fileId: raw,
    typeId,
    hasReference,
    hasWebLocation,
    fileReference,
    dcId,
    id,
    accessHash,
    typeGeneric: "document",
    typeDetailed: DOCUMENT_TYPES[typeId] ?? `unknown(${typeId})`,
    version,
    subVersion,
    ownerId: ownerId(id, typeId, version),
  };
}
