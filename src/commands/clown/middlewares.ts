import type { BotContext, ClownCall } from "@/lib/bot";

import { db } from "@/db";
import { parseFileId } from "@/lib/parse-file-id";

interface MediaIds {
  gifIds: string[] | null;
  stickerIds: string[] | null;
}

const clownTexts = ["🤡", "دلقک"];
const unclownTexts = ["😇", "ستون", "آدم عاقل"];

// eslint-disable-next-line complexity
export const isClownCall = async (ctx: BotContext, next: () => Promise<unknown>) => {
  if (!ctx.msg || !ctx.chat) return null;

  if (ctx.msg.text && clownTexts.includes(ctx.msg.text)) {
    ctx.clownCall = "clown";
    return await next();
  }

  if (ctx.msg.text && unclownTexts.includes(ctx.msg.text)) {
    ctx.clownCall = "unclown";
    return await next();
  }

  const group = await db.query.groups.findFirst({
    columns: { gifIds: true, stickerIds: true, unclownGifIds: true, unclownStickerIds: true },
    //@ts-ignore I'm pretty sure I checked ctx.chat, why the hell it gives me an error?
    where: (f, o) => o.eq(f.id, ctx.chat.id),
  });

  if (group) {
    const { gifIds, stickerIds, unclownGifIds, unclownStickerIds } = group;

    const configs: [string, MediaIds][] = [
      ["clown", { gifIds, stickerIds }],
      ["unclown", { gifIds: unclownGifIds, stickerIds: unclownStickerIds }],
    ];

    const fileId = ctx.msg.animation?.file_id ?? ctx.msg.sticker?.file_id;
    const parsedId = fileId ? parseFileId(fileId).id.toString() : null;

    if (parsedId) {
      for await (const [call, { gifIds: g, stickerIds: s }] of configs) {
        if (g?.includes(parsedId) || s?.includes(parsedId)) {
          ctx.clownCall = call as ClownCall;
          return await next();
        }
      }
    }
  }

  return null;
};
