import type { Message } from "grammy/types";

import type { BotContext } from "@/lib/bot";

import { db, schema } from "@/db";
import { parseFileId } from "@/lib/parse-file-id";

type Group = typeof schema.groups.$inferSelect;

type GroupPatch = Partial<typeof schema.groups.$inferInsert>;

interface MediaConfig {
  /** i18n key prefix, e.g. `cmd_setgif` → `cmd_setgif_invalid`, `cmd_setgif_limit`, ... */
  key: string;
  max: number;
  getFileId: (msg: Message) => string | undefined;
  getIds: (group: Group | undefined) => string[];
  apply: (value: string[] | null) => GroupPatch;
}

export function createSetMediaHandler(config: MediaConfig) {
  return async (ctx: BotContext) => {
    const { msg } = ctx;
    if (!msg) return;

    const replyTo = msg.reply_to_message;

    if (!replyTo) return await ctx.replyTo(msg, ctx.t(config.key));

    const rawFileId = config.getFileId(replyTo);
    if (!rawFileId) return await ctx.replyTo(msg, ctx.t(`${config.key}_invalid`));

    const group = await db.query.groups.findFirst({
      where: (f, o) => o.eq(f.id, msg.chat.id),
    });

    const existing = config.getIds(group);

    if (existing.length >= config.max) return await ctx.replyTo(msg, ctx.t(`${config.key}_limit`));

    const updated = [...existing, parseFileId(rawFileId).id.toString()];
    const patch = { name: msg.chat.title, ...config.apply(updated) };

    await db
      .insert(schema.groups)
      .values({ id: msg.chat.id, ...patch })
      .onConflictDoUpdate({
        target: [schema.groups.id],
        set: patch,
      });

    return await ctx.replyTo(msg, ctx.t(`${config.key}_done`, { count: updated.length, max: config.max }));
  };
}

export function createRemoveMediaHandler(config: MediaConfig) {
  return async (ctx: BotContext) => {
    const { msg } = ctx;
    if (!msg) return;

    const replyTo = msg.reply_to_message;

    if (!replyTo) return await ctx.replyTo(msg, ctx.t(`${config.key}_usage`));

    const rawFileId = config.getFileId(replyTo);
    if (!rawFileId) return await ctx.replyTo(msg, ctx.t(`${config.key}_invalid`));

    const group = await db.query.groups.findFirst({
      where: (f, o) => o.eq(f.id, msg.chat.id),
    });

    const existing = config.getIds(group);

    if (existing.length === 0) return await ctx.replyTo(msg, ctx.t(`${config.key}_empty`));

    const fileId = parseFileId(rawFileId).id.toString();
    if (!existing.includes(fileId)) return await ctx.replyTo(msg, ctx.t(`${config.key}_not_found`));

    const updated = existing.filter((id) => id !== fileId);
    const patch = { name: msg.chat.title, ...config.apply(updated.length > 0 ? updated : null) };

    await db
      .insert(schema.groups)
      .values({ id: msg.chat.id, ...patch })
      .onConflictDoUpdate({
        target: [schema.groups.id],
        set: patch,
      });

    return await ctx.replyTo(msg, ctx.t(`${config.key}_done`));
  };
}
