import type { ParsedFileId } from "@/lib/file-id/types";

import { BinaryReader } from "@/lib/file-id/binary-reader";
import { DOCUMENT_TYPES, PHOTO_TYPES } from "@/lib/file-id/constants";
import { normalizeTypeId, ownerId, parsePhotosize } from "@/lib/file-id/parsers";
import { base64urlDecode, parseVersion, rleDecode, unpackTlString } from "@/lib/file-id/utils";

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
    const photosizeSource = version < 4 ? 0 /* legacy */ : reader.readUInt32LE();
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
