import { Command } from "@grammyjs/commands";

import type { BotContext } from "@/lib/bot";

import { createSetMediaHandler } from "./media";

const MAX_GIFS = 3;
const MAX_STICKERS = 3;
const MAX_UNCLOWN_GIFS = 3;
const MAX_UNCLOWN_STICKERS = 3;

export const cmdSetGif = new Command<BotContext>("setgif", "🛡 تنظیم گیف دلقک کننده گروه") //
  .addToScope(
    { type: "all_chat_administrators" },
    createSetMediaHandler({
      key: "cmd_setgif",
      max: MAX_GIFS,
      getFileId: (msg) => msg.animation?.file_id,
      getIds: (group) => group?.gifIds ?? [],
      apply: (value) => ({ gifIds: value }),
    }),
  );

export const cmdSetSticker = new Command<BotContext>("setsticker", "🛡 تنظیم استیکر دلقک کننده گروه") //
  .addToScope(
    { type: "all_chat_administrators" },
    createSetMediaHandler({
      key: "cmd_setsticker",
      max: MAX_STICKERS,
      getFileId: (msg) => msg.sticker?.file_id,
      getIds: (group) => group?.stickerIds ?? [],
      apply: (value) => ({ stickerIds: value }),
    }),
  );

export const cmdSetUnclownGif = new Command<BotContext>("setunclowngif", "🛡 تنظیم گیف دلقک‌بردار گروه") //
  .addToScope(
    { type: "all_chat_administrators" },
    createSetMediaHandler({
      key: "cmd_setunclowngif",
      max: MAX_UNCLOWN_GIFS,
      getFileId: (msg) => msg.animation?.file_id,
      getIds: (group) => group?.unclownGifIds ?? [],
      apply: (value) => ({ unclownGifIds: value }),
    }),
  );

export const cmdSetUnclownSticker = new Command<BotContext>("setunclownsticker", "🛡 تنظیم استیکر دلقک‌بردار گروه") //
  .addToScope(
    { type: "all_chat_administrators" },
    createSetMediaHandler({
      key: "cmd_setunclownsticker",
      max: MAX_UNCLOWN_STICKERS,
      getFileId: (msg) => msg.sticker?.file_id,
      getIds: (group) => group?.unclownStickerIds ?? [],
      apply: (value) => ({ unclownStickerIds: value }),
    }),
  );
