/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable no-bitwise */

export const TYPE_ID_WEB_LOCATION_FLAG = 1 << 24;
export const TYPE_ID_FILE_REFERENCE_FLAG = 1 << 25;

export enum TYPE {
  THUMBNAIL,
  PROFILE_PHOTO,
  PHOTO,
  VOICE,
  VIDEO,
  DOCUMENT,
  ENCRYPTED,
  TEMP,
  STICKER,
  AUDIO,
  ANIMATION,
  ENCRYPTED_THUMBNAIL,
  WALLPAPER,
  VIDEO_NOTE,
  SECURE_RAW,
  SECURE,
  BACKGROUND,
  SIZE,
  NONE,
}

export enum PHOTOSIZE {
  SOURCE_LEGACY,
  SOURCE_THUMBNAIL,
  SOURCE_DIALOGPHOTO_SMALL,
  SOURCE_DIALOGPHOTO_BIG,
  SOURCE_STICKERSET_THUMBNAIL,
}

export const DOCUMENT_TYPES: Record<number, string> = {
  [TYPE.VOICE]: "voice",
  [TYPE.VIDEO]: "video",
  [TYPE.DOCUMENT]: "document",
  [TYPE.STICKER]: "sticker",
  [TYPE.AUDIO]: "song",
  [TYPE.ANIMATION]: "animation",
  [TYPE.VIDEO_NOTE]: "video note",
};

export const PHOTO_TYPES: Record<number, string> = {
  [TYPE.THUMBNAIL]: "thumbnail",
  [TYPE.PROFILE_PHOTO]: "profile picture",
  [TYPE.PHOTO]: "photo",
};
