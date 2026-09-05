import type { BinaryReader } from "@/lib/file-id/binary-reader";
import type { PhotosizeSource } from "@/lib/file-id/types";

import { PHOTOSIZE, TYPE, TYPE_ID_FILE_REFERENCE_FLAG, TYPE_ID_WEB_LOCATION_FLAG } from "@/lib/file-id/constants";
import { unpackNullTerminatedString } from "@/lib/file-id/utils";

/* eslint-disable no-bitwise */

export function normalizeTypeId(rawTypeId: number): { typeId: number; hasReference: boolean; hasWebLocation: boolean } {
  const hasReference = (rawTypeId & TYPE_ID_FILE_REFERENCE_FLAG) !== 0;
  const hasWebLocation = (rawTypeId & TYPE_ID_WEB_LOCATION_FLAG) !== 0;
  const typeId = rawTypeId & ~TYPE_ID_FILE_REFERENCE_FLAG & ~TYPE_ID_WEB_LOCATION_FLAG;
  return { typeId, hasReference, hasWebLocation };
}

export function ownerId(id: bigint, typeId: number, version: number): bigint | null {
  if (!(version === 2 || version === 4) || typeId !== TYPE.STICKER) {
    return null;
  }

  return (id & (((1n << 24n) - 1n) << 32n)) / (1n << 32n);
}

export function parsePhotosize(reader: BinaryReader, source: number, volumeId: bigint): PhotosizeSource {
  if (source === PHOTOSIZE.SOURCE_DIALOGPHOTO_SMALL || source === PHOTOSIZE.SOURCE_DIALOGPHOTO_BIG) {
    const dialogId = reader.readBigInt64LE();
    const dialogAccessHash = reader.readBigInt64LE();
    const locationLocalId = reader.readInt32LE();
    return {
      type: source === PHOTOSIZE.SOURCE_DIALOGPHOTO_SMALL ? "dialogPhotoSmall" : "dialogPhotoBig",
      volumeId,
      dialogId,
      dialogAccessHash,
      locationLocalId,
    };
  }

  switch (source) {
    case PHOTOSIZE.SOURCE_LEGACY:
      return {
        type: "legacy",
        volumeId,
        secret: reader.readBigInt64LE(),
        locationLocalId: reader.readInt32LE(),
      };

    case PHOTOSIZE.SOURCE_THUMBNAIL:
      return {
        type: "thumbnail",
        volumeId,
        fileType: reader.readUInt32LE(),
        thumbnailType: unpackNullTerminatedString(reader.read(4)).toString("utf8"),
        locationLocalId: reader.readInt32LE(),
      };

    case PHOTOSIZE.SOURCE_STICKERSET_THUMBNAIL:
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
