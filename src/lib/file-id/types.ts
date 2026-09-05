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
