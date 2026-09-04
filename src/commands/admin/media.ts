import type { Message } from "grammy/types";

import type { BotContext } from "@/lib/bot";

import { db, schema } from "@/db";
import { parseFileId } from "@/lib/parse-file-id";

type Group = typeof schema.groups.$inferSelect;

export type GroupPatch = Partial<typeof schema.groups.$inferInsert>;

export interface MediaSpec {
  /** i18n key prefix, e.g. `cmd_setgif` → `cmd_setgif_invalid`, `cmd_setgif_limit`, ... */
  key: string;
  max: number;
  getFileId: (msg: Message) => string | undefined;
  getIds: (group: Group | undefined) => string[];
  apply: (value: string[] | null) => GroupPatch;
}

async function saveGroup(chatId: number, name: string | undefined, patch: GroupPatch): Promise<void> {
  const values = { id: chatId, name, ...patch };

  await db.insert(schema.groups).values(values).onConflictDoUpdate({
    target: schema.groups.id,
    set: patch,
  });
}

export function createSetMediaHandler(spec: MediaSpec) {
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

    await saveGroup(msg.chat.id, msg.chat.title, { ...spec.apply(updated), name: msg.chat.title });

    return await ctx.replyTo(msg, ctx.t(`${spec.key}_done`, { count: updated.length, max: spec.max }));
  };
}

export function createRemoveMediaHandler(spec: MediaSpec) {
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

    await saveGroup(msg.chat.id, msg.chat.title, {
      ...spec.apply(updated.length > 0 ? updated : null),
      name: msg.chat.title,
    });

    return await ctx.replyTo(msg, ctx.t(`${spec.key}_done`));
  };
}
