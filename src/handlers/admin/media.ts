import type { BotCommandScope, Message } from "grammy/types";

import type { schema } from "@/db";
import type { CommandHandler } from "@/handlers";
import type { BotContext } from "@/lib/bot";
import type { GroupPatch } from "@/lib/utils";

import { db } from "@/db";
import { parseFileId } from "@/lib/file-id";
import { saveGroup } from "@/lib/utils";

type FilesOfGroup = Pick<
  typeof schema.groups.$inferSelect,
  "gifIds" | "stickerIds" | "unclownGifIds" | "unclownStickerIds"
>;

const MAX_MEDIA = 3;

interface MediaKind {
  key: string;
  description: string;
  getFileId: (msg: Message) => string | undefined;
  getIds: (group: FilesOfGroup | undefined) => string[];
  apply: (value: string[] | null) => GroupPatch;
}

interface MediaSpec {
  /** i18n key prefix, e.g. `cmd_setgif` → `cmd_setgif_invalid`, `cmd_setgif_limit`, ... */
  key: string;
  max: number;
  getFileId: (msg: Message) => string | undefined;
  getIds: (group: FilesOfGroup | undefined) => string[];
  apply: (value: string[] | null) => GroupPatch;
}

function createSetMediaHandler(spec: MediaSpec) {
  return async (ctx: BotContext) => {
    const { msg } = ctx;
    if (!msg) return;

    const replyTo = msg.reply_to_message;

    if (!replyTo) return await ctx.replyTo(msg, ctx.t(spec.key));

    const rawFileId = spec.getFileId(replyTo);
    if (!rawFileId) return await ctx.replyTo(msg, ctx.t(`${spec.key}_invalid`));

    const group = await db.query.groups.findFirst({
      where: (f, o) => o.eq(f.id, msg.chat.id),
    });

    const existing = spec.getIds(group);

    if (existing.length >= spec.max) return await ctx.replyTo(msg, ctx.t(`${spec.key}_limit`));

    const updated = [...existing, parseFileId(rawFileId).id.toString()];

    await saveGroup(msg.chat.id, msg.chat.title, { ...spec.apply(updated) });

    return await ctx.replyTo(msg, ctx.t(`${spec.key}_done`, { count: updated.length, max: spec.max }));
  };
}

function createRemoveMediaHandler(spec: MediaSpec) {
  return async (ctx: BotContext) => {
    const { msg } = ctx;
    if (!msg) return;

    const replyTo = msg.reply_to_message;

    if (!replyTo) return await ctx.replyTo(msg, ctx.t(`${spec.key}_usage`));

    const rawFileId = spec.getFileId(replyTo);
    if (!rawFileId) return await ctx.replyTo(msg, ctx.t(`${spec.key}_invalid`));

    const group = await db.query.groups.findFirst({
      where: (f, o) => o.eq(f.id, msg.chat.id),
    });

    const existing = spec.getIds(group);

    if (existing.length === 0) return await ctx.replyTo(msg, ctx.t(`${spec.key}_empty`));

    const fileId = parseFileId(rawFileId).id.toString();
    if (!existing.includes(fileId)) return await ctx.replyTo(msg, ctx.t(`${spec.key}_not_found`));

    const updated = existing.filter((id) => id !== fileId);

    await saveGroup(msg.chat.id, msg.chat.title, { ...spec.apply(updated.length > 0 ? updated : null) });

    return await ctx.replyTo(msg, ctx.t(`${spec.key}_done`));
  };
}

const KINDS: MediaKind[] = [
  {
    key: "gif",
    description: "گیف دلقک کننده گروه",
    getFileId: (msg) => msg.animation?.file_id,
    getIds: (group) => group?.gifIds ?? [],
    apply: (value) => ({ gifIds: value }),
  },
  {
    key: "sticker",
    description: "استیکر دلقک کننده گروه",
    getFileId: (msg) => msg.sticker?.file_id,
    getIds: (group) => group?.stickerIds ?? [],
    apply: (value) => ({ stickerIds: value }),
  },
  {
    key: "unclowngif",
    description: "گیف کسر دلقک گروه",
    getFileId: (msg) => msg.animation?.file_id,
    getIds: (group) => group?.unclownGifIds ?? [],
    apply: (value) => ({ unclownGifIds: value }),
  },
  {
    key: "unclownsticker",
    description: "استیکر کسر دلقک گروه",
    getFileId: (msg) => msg.sticker?.file_id,
    getIds: (group) => group?.unclownStickerIds ?? [],
    apply: (value) => ({ unclownStickerIds: value }),
  },
];

function toSpec(kind: MediaKind, verb: "remove" | "set"): MediaSpec {
  return {
    key: `cmd_${verb}${kind.key}`,
    max: MAX_MEDIA,
    getFileId: kind.getFileId,
    getIds: kind.getIds,
    apply: kind.apply,
  };
}

export const mediaHandlers: CommandHandler[] = KINDS.flatMap((kind) => {
  const scopes: BotCommandScope[] = [{ type: "all_chat_administrators" }];

  return [
    {
      kind: "command",
      name: `set${kind.key}`,
      description: `🛡 تنظیم ${kind.description}`,
      scopes,
      handler: createSetMediaHandler(toSpec(kind, "set")),
    },
    {
      kind: "command",
      name: `remove${kind.key}`,
      description: `🛡 حذف ${kind.description}`,
      scopes,
      handler: createRemoveMediaHandler(toSpec(kind, "remove")),
    },
  ] satisfies CommandHandler[];
});
