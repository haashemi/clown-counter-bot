import type { Context } from "grammy";

import { clownVotesTable, db, usersTable } from "@/db";

export const onClown = async (ctx: Context) => {
  const messageId = ctx.message?.message_id;
  const chatId = ctx.message?.chat.id;
  const clown = ctx.message?.reply_to_message?.from;
  const user = ctx.message?.from;
  if (!messageId || !chatId || !clown || !user) return;

  const userName = `${user.first_name}${user.last_name ? ` ${user.last_name}` : ""}`;
  const clownName = `${clown.first_name}${clown.last_name ? ` ${clown.last_name}` : ""}`;

  const dbUser = await db
    .insert(usersTable)
    .values({ tgId: user.id, name: userName })
    .onConflictDoUpdate({ target: usersTable.tgId, set: { name: userName } })
    .returning({ id: usersTable.tgId });

  const dbClown = await db
    .insert(usersTable)
    .values({ tgId: clown.id, name: clownName })
    .onConflictDoUpdate({ target: usersTable.tgId, set: { name: clownName } })
    .returning({ id: usersTable.tgId });

  if (!dbClown[0] || !dbUser[0]) return;

  await db
    .insert(clownVotesTable)
    .values({
      groupId: chatId,
      voterId: dbUser[0].id,
      clownId: dbClown[0].id,
    })
    .onConflictDoUpdate({
      target: [clownVotesTable.groupId, clownVotesTable.voterId],
      set: { clownId: dbClown[0].id },
    });

  ctx.reply(`🤡 دلقک انتخابی شما به ${clownName} تغییر کرد.`, {
    reply_parameters: { message_id: messageId, chat_id: chatId },
  });
};
