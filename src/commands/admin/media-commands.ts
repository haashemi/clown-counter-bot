import type { Message } from "grammy/types";

import { Command } from "@grammyjs/commands";

import type { BotContext } from "@/lib/bot";

import type { GroupPatch, MediaSpec } from "./media";

import { createRemoveMediaHandler, createSetMediaHandler } from "./media";

const MAX_MEDIA = 3;

interface MediaKind {
  /** Command name suffix and i18n key suffix, e.g. `gif` → `cmd_setgif`, `/setgif`. */
  suffix: string;
  /** fa description fragment: the media type and whether it triggers clown or unclown. */
  fa: string;
  getFileId: (msg: Message) => string | undefined;
  getIds: (
    group:
      | {
          gifIds: string[] | null;
          stickerIds: string[] | null;
          unclownGifIds: string[] | null;
          unclownStickerIds: string[] | null;
        }
      | undefined,
  ) => string[];
  apply: (value: string[] | null) => GroupPatch;
}

const KINDS: MediaKind[] = [
  {
    suffix: "gif",
    fa: "گیف دلقک کننده گروه",
    getFileId: (msg) => msg.animation?.file_id,
    getIds: (group) => group?.gifIds ?? [],
    apply: (value) => ({ gifIds: value }),
  },
  {
    suffix: "sticker",
    fa: "استیکر دلقک کننده گروه",
    getFileId: (msg) => msg.sticker?.file_id,
    getIds: (group) => group?.stickerIds ?? [],
    apply: (value) => ({ stickerIds: value }),
  },
  {
    suffix: "unclowngif",
    fa: "گیف کسر دلقک گروه",
    getFileId: (msg) => msg.animation?.file_id,
    getIds: (group) => group?.unclownGifIds ?? [],
    apply: (value) => ({ unclownGifIds: value }),
  },
  {
    suffix: "unclownsticker",
    fa: "استیکر کسر دلقک گروه",
    getFileId: (msg) => msg.sticker?.file_id,
    getIds: (group) => group?.unclownStickerIds ?? [],
    apply: (value) => ({ unclownStickerIds: value }),
  },
];

function spec(kind: MediaKind, verb: "remove" | "set"): MediaSpec {
  return {
    key: `cmd_${verb}${kind.suffix}`,
    max: MAX_MEDIA,
    getFileId: kind.getFileId,
    getIds: kind.getIds,
    apply: kind.apply,
  };
}

export const mediaCommands = KINDS.flatMap((kind) => {
  const setCmd = new Command<BotContext>(`set${kind.suffix}`, `🛡 تنظیم ${kind.fa}`) //
    .addToScope({ type: "all_chat_administrators" }, createSetMediaHandler(spec(kind, "set")));

  const removeCmd = new Command<BotContext>(`remove${kind.suffix}`, `🛡 حذف ${kind.fa}`) //
    .addToScope({ type: "all_chat_administrators" }, createRemoveMediaHandler(spec(kind, "remove")));

  return [setCmd, removeCmd];
});
