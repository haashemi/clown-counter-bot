import type { BotContext } from "@/lib/bot";

import { db } from "@/db";

const clownTexts = ["🤡", "دلقک"];

export const isClownCall = async (ctx: BotContext, next: () => Promise<unknown>) => {
  if (!ctx.msg || !ctx.chat) return null;

  if (ctx.msg.text && clownTexts.includes(ctx.msg.text)) {
    return await next();
  }

  const group = await db.query.groups.findFirst({
    columns: { gifId: true, stickerId: true },
    //@ts-ignore I'm pretty sure I checked ctx.chat, why the hell it gives me an error?
    where: (f, o) => o.eq(f.id, ctx.chat.id),
  });

  if (group) {
    const isValidGif = ctx.msg.video?.file_id === group.gifId;
    const isValidSticker = ctx.msg.sticker?.file_id === group.stickerId;

    if (isValidGif || isValidSticker) {
      return await next();
    }
  }

  return null;
};
