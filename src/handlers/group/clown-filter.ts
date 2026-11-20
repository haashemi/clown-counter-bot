import { and, eq } from "drizzle-orm";

import type { BotContext, ClownCall } from "@/lib/bot";

import { db, schema } from "@/db";
import { messageMedia } from "@/lib/media-key";

const clownTexts = ["🤡", "دلقک"];
const unclownTexts = ["😇", "ستون", "آدم عاقل"];

function matchText(text: string | undefined): ClownCall | null {
  if (clownTexts.includes(text ?? "")) return "clown";
  if (unclownTexts.includes(text ?? "")) return "unclown";
  return null;
}

async function matchMediaCall(ctx: BotContext): Promise<ClownCall | null> {
  const media = messageMedia(ctx.msg);
  const chatId = ctx.chat?.id;
  if (!media || !chatId) return null;

  const where = and(eq(schema.groupTriggers.groupId, chatId), eq(schema.groupTriggers.key, media.key));
  const [trigger] = await db
    .select({ action: schema.groupTriggers.action, fileId: schema.groupTriggers.fileId })
    .from(schema.groupTriggers)
    .where(where);
  if (!trigger) return null;

  // Rows migrated from the old jsonb columns have no file_id; fill it in so /triggers can preview them.
  if (trigger.fileId === null) await db.update(schema.groupTriggers).set({ fileId: media.fileId }).where(where);

  return trigger.action;
}

/** Matcher for the 🤡/دلقک flow: sets `ctx.clownCall` and returns true, or returns false. */
export async function isClownCall(ctx: BotContext): Promise<boolean> {
  if (!ctx.msg || !ctx.chat) return false;

  const call = matchText(ctx.msg.text) ?? (await matchMediaCall(ctx));

  if (!call) return false;

  // False positive: each grammY update gets a fresh ctx; there is no shared mutable state.
  // eslint-disable-next-line require-atomic-updates
  ctx.clownCall = call;

  return true;
}
