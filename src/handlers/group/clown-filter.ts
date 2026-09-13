import type { MiddlewareFn } from "grammy";

import type { BotContext, ClownCall } from "@/lib/bot";

import { db } from "@/db";
import { parseFileId } from "@/lib/file-id";

const clownTexts = ["🤡", "دلقک"];
const unclownTexts = ["😇", "ستون", "آدم عاقل"];

const MEDIA_COLUMNS = { gifIds: true, stickerIds: true, unclownGifIds: true, unclownStickerIds: true } as const;

function matchText(text: string | undefined): ClownCall | null {
  if (clownTexts.includes(text ?? "")) return "clown";
  if (unclownTexts.includes(text ?? "")) return "unclown";
  return null;
}

function matchMedia(group: Record<keyof typeof MEDIA_COLUMNS, string[] | null>, parsedId: string): ClownCall | null {
  if (group.gifIds?.includes(parsedId) || group.stickerIds?.includes(parsedId)) return "clown";
  if (group.unclownGifIds?.includes(parsedId) || group.unclownStickerIds?.includes(parsedId)) return "unclown";
  return null;
}

async function matchMediaCall(ctx: BotContext): Promise<ClownCall | null> {
  const fileId = ctx.msg?.animation?.file_id ?? ctx.msg?.sticker?.file_id;

  const chatId = ctx.chat?.id;
  if (!fileId || !chatId) return null;

  const group = await db.query.groups.findFirst({
    columns: MEDIA_COLUMNS,
    where: (f, o) => o.eq(f.id, chatId),
  });

  if (!group) return null;

  return matchMedia(group, parseFileId(fileId).id.toString());
}

/** Matcher for the 🤡/دلقک flow: sets `ctx.clownCall` and continues, or stops the chain. */
export const isClownCall: MiddlewareFn<BotContext> = async (ctx, next) => {
  if (!ctx.msg || !ctx.chat) return null;

  const call = matchText(ctx.msg.text) ?? (await matchMediaCall(ctx));

  if (!call) return null;

  // False positive: each grammY update gets a fresh ctx; there is no shared mutable state.
  // eslint-disable-next-line require-atomic-updates
  ctx.clownCall = call;

  return await next();
};
