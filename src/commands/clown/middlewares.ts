import type { BotContext } from "@/lib/bot";

import { db } from "@/db";
import { parseFileIds } from "@/lib/utils";

const clownTexts = ["🤡", "دلقک"];

export const isClownCall = async (ctx: BotContext, next: () => Promise<unknown>) => {
  if (!ctx.msg || !ctx.chat) return null;

  if (ctx.msg.text && clownTexts.includes(ctx.msg.text)) {
    return await next();
  }

  const group = await db.query.groups.findFirst({
    columns: { gifIds: true, stickerIds: true },
    //@ts-ignore I'm pretty sure I checked ctx.chat, why the hell it gives me an error?
    where: (f, o) => o.eq(f.id, ctx.chat.id),
  });

  if (group) {
    const gifIds = parseFileIds(group.gifIds);
    const stickerIds = parseFileIds(group.stickerIds);

    const isValidGif = ctx.msg.animation?.file_id && gifIds.includes(ctx.msg.animation.file_id);
    const isValidSticker = ctx.msg.sticker?.file_id && stickerIds.includes(ctx.msg.sticker.file_id);

    if (isValidGif || isValidSticker) {
      return await next();
    }
  }

  return null;
};
