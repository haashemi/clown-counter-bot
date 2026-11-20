import type { GroupPatch } from "@/db";
import type { CommandHandler } from "@/handlers";
import type { BotContext } from "@/lib/bot";

import { db, saveGroup } from "@/db";
import { ADMIN } from "@/lib/bot";
import { mediaKey } from "@/lib/media-key";

const MAX_MEDIA = 3;

type MediaColumn = "gifIds" | "stickerIds" | "unclownGifIds" | "unclownStickerIds";

interface MediaKind {
  /** `/set<key>`, `/remove<key>` and i18n keys `cmd_set<key>*`, `cmd_remove<key>*`. */
  key: string;
  column: MediaColumn;
  media: "animation" | "sticker";
  description: string;
}

const KINDS: MediaKind[] = [
  { key: "gif", column: "gifIds", media: "animation", description: "گیف دلقک کننده گروه" },
  { key: "sticker", column: "stickerIds", media: "sticker", description: "استیکر دلقک کننده گروه" },
  { key: "unclowngif", column: "unclownGifIds", media: "animation", description: "گیف کسر دلقک گروه" },
  { key: "unclownsticker", column: "unclownStickerIds", media: "sticker", description: "استیکر کسر دلقک گروه" },
];

function mediaHandler({ key, column, media }: MediaKind, verb: "remove" | "set") {
  const prefix = `cmd_${verb}${key}`;

  return async (ctx: BotContext) => {
    const { msg } = ctx;
    if (!msg) return;

    const target = msg.reply_to_message;
    if (!target) return ctx.replyTo(msg, ctx.t(verb === "set" ? prefix : `${prefix}_usage`));

    const fileId = target[media]?.file_id;
    if (!fileId) return ctx.replyTo(msg, ctx.t(`${prefix}_invalid`));

    const group = await db.query.groups.findFirst({ where: (f, o) => o.eq(f.id, msg.chat.id) });
    const existing = group?.[column] ?? [];
    const id = mediaKey(fileId);

    if (verb === "set") {
      if (existing.length >= MAX_MEDIA) return ctx.replyTo(msg, ctx.t(`${prefix}_limit`));
      const updated = [...existing, id];
      await saveGroup(msg.chat.id, msg.chat.title, { [column]: updated } satisfies GroupPatch);
      return ctx.replyTo(msg, ctx.t(`${prefix}_done`, { count: updated.length, max: MAX_MEDIA }));
    }

    if (existing.length === 0) return ctx.replyTo(msg, ctx.t(`${prefix}_empty`));
    if (!existing.includes(id)) return ctx.replyTo(msg, ctx.t(`${prefix}_not_found`));

    const updated = existing.filter((x) => x !== id);
    await saveGroup(msg.chat.id, msg.chat.title, {
      [column]: updated.length > 0 ? updated : null,
    } satisfies GroupPatch);
    return ctx.replyTo(msg, ctx.t(`${prefix}_done`));
  };
}

export const mediaHandlers: CommandHandler[] = KINDS.flatMap((kind) =>
  (["set", "remove"] as const).map((verb) => ({
    kind: "command",
    name: `${verb}${kind.key}`,
    description: `🛡 ${verb === "set" ? "تنظیم" : "حذف"} ${kind.description}`,
    scopes: ADMIN,
    handler: mediaHandler(kind, verb),
  })),
);
