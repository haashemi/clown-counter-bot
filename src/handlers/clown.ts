import type { User } from "grammy/types";

import type { BotContext } from "@/lib/bot";

import { clownVotesTable, db, groupsTable, usersTable } from "@/db";

const CLOWN_DELAY = 10 * 60 * 1000;

interface Data {
  messageId: number;
  group: { id: number; name: string };
  voter: User & { name: string };
  clown: User & { name: string };
}

const getData = (ctx: BotContext): Data | null => {
  if (!ctx.message) return null;

  const voter = ctx.message.from;
  const clown = ctx.message.reply_to_message?.from;

  if (!clown || !voter) return null;

  return {
    messageId: ctx.message.message_id,
    group: { id: ctx.message.chat.id, name: ctx.message.chat.title ?? "" },
    voter: { ...voter, name: `${voter.first_name}${voter.last_name ? ` ${voter.last_name}` : ""}` },
    clown: { ...clown, name: `${clown.first_name}${clown.last_name ? ` ${clown.last_name}` : ""}` },
  };
};

const canInsert = async ({ group: { id }, voter }: Data): Promise<{ allowed: boolean; waitMin: number }> => {
  const res = await db.query.clownVotesTable.findFirst({
    columns: { votedAt: true },
    where: (f, o) => o.and(o.eq(f.groupId, id), o.eq(f.voterId, voter.id)),
    orderBy: (f, o) => o.desc(f.votedAt),
  });

  if (!res) return { allowed: true, waitMin: 0 };

  const now = Date.now();
  const last = new Date(res.votedAt).getTime();
  const diff = now - last;

  if (diff > CLOWN_DELAY) {
    return { allowed: true, waitMin: 0 };
  }

  const waitMin = Math.ceil((CLOWN_DELAY - diff) / 1000 / 60);

  return { allowed: false, waitMin };
};

export const onClown = async (ctx: BotContext) => {
  const data = getData(ctx);
  if (!data) return;

  const { messageId, group, voter, clown } = data;

  if (clown.id === ctx.me.id) {
    return await ctx.reply(ctx.t("cmd_clown_is_me"), {
      reply_parameters: { message_id: messageId, chat_id: group.id },
    });
  } else if (clown.is_bot) {
    return await ctx.reply(ctx.t("cmd_clown_is_bot"), {
      reply_parameters: { message_id: messageId, chat_id: group.id },
    });
  } else if (voter.id === clown.id) {
    return await ctx.reply(ctx.t("cmd_clown_is_you"), {
      reply_parameters: { message_id: messageId, chat_id: group.id },
    });
  }

  // TODO: There has to be a better way...
  // Insert voter, clown, and the group concurrently.
  await Promise.all([
    db
      .insert(usersTable)
      .values({ tgId: voter.id, name: voter.name })
      .onConflictDoUpdate({ target: usersTable.tgId, set: { name: voter.name } }),
    db
      .insert(usersTable)
      .values({ tgId: clown.id, name: clown.name })
      .onConflictDoUpdate({ target: usersTable.tgId, set: { name: clown.name } }),
    db
      .insert(groupsTable)
      .values({ tgId: group.id, name: group.name })
      .onConflictDoUpdate({ target: groupsTable.tgId, set: { name: group.name } }),
  ]);

  const result = await canInsert(data);
  if (!result.allowed) {
    return await ctx.reply(ctx.t("cmd_clown_wait", { waitMin: result.waitMin }), {
      reply_parameters: { message_id: messageId, chat_id: group.id },
    });
  }

  await db.insert(clownVotesTable).values({
    groupId: group.id,
    voterId: voter.id,
    clownId: clown.id,
  });

  return await ctx.reply(ctx.t("cmd_clown", { clown: clown.name, voter: voter.name }), {
    reply_parameters: { message_id: messageId, chat_id: group.id },
  });
};
