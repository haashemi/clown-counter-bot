import { Command } from "@grammyjs/commands";

import type { BotContext } from "@/lib/bot";

import { createRemoveMediaHandler } from "./media";

export const cmdRemoveGif = new Command<BotContext>("removegif", "🛡 حذف گیف دلقک کننده گروه") //
  .addToScope(
    { type: "all_chat_administrators" },
    createRemoveMediaHandler({
      key: "cmd_removegif",
      max: 3,
      getFileId: (msg) => msg.animation?.file_id,
      getIds: (group) => group?.gifIds ?? [],
      apply: (value) => ({ gifIds: value }),
    }),
  );

export const cmdRemoveSticker = new Command<BotContext>("removesticker", "🛡 حذف استیکر دلقک کننده گروه") //
  .addToScope(
    { type: "all_chat_administrators" },
    createRemoveMediaHandler({
      key: "cmd_removesticker",
      max: 3,
      getFileId: (msg) => msg.sticker?.file_id,
      getIds: (group) => group?.stickerIds ?? [],
      apply: (value) => ({ stickerIds: value }),
    }),
  );

export const cmdRemoveUnclownGif = new Command<BotContext>("removeunclowngif", "🛡 حذف گیف دلقک‌بردار گروه") //
  .addToScope(
    { type: "all_chat_administrators" },
    createRemoveMediaHandler({
      key: "cmd_removeunclowngif",
      max: 3,
      getFileId: (msg) => msg.animation?.file_id,
      getIds: (group) => group?.unclownGifIds ?? [],
      apply: (value) => ({ unclownGifIds: value }),
    }),
  );

export const cmdRemoveUnclownSticker = new Command<BotContext>("removeunclownsticker", "🛡 حذف استیکر دلقک‌بردار گروه") //
  .addToScope(
    { type: "all_chat_administrators" },
    createRemoveMediaHandler({
      key: "cmd_removeunclownsticker",
      max: 3,
      getFileId: (msg) => msg.sticker?.file_id,
      getIds: (group) => group?.unclownStickerIds ?? [],
      apply: (value) => ({ unclownStickerIds: value }),
    }),
  );
