import type { Context } from "grammy";

import { count, desc, eq } from "drizzle-orm";

import { clownVotesTable, db, usersTable } from "@/db";

export const onStats = async (ctx: Context) => {
  const message = ctx.message;
  if (!message) return;

  const clowns = await db
    .select({
      name: usersTable.name,
      count: count(clownVotesTable.id),
    })
    .from(clownVotesTable)
    .leftJoin(usersTable, eq(usersTable.tgId, clownVotesTable.clownId))
    .groupBy(usersTable.tgId)
    .where(eq(clownVotesTable.groupId, message.chat.id))
    .orderBy(desc(count(clownVotesTable.id)));

  if (clowns.length === 0) {
    return ctx.reply("دلقک‌های گروه شما هنوز مشخص نیست.\n\nنظرت چیه اولیش خودت باشی؟ 🤡", {
      reply_parameters: { message_id: message.message_id, chat_id: message.chat.id },
    });
  }

  const clownsText = clowns.map((c) => `\u200F— ${c.name} با ${c.count} رای`);

  ctx.reply(`🔥 دلقک‌های برتر گروه\n\n${clownsText.join("\n")}`, {
    reply_parameters: { message_id: message.message_id, chat_id: message.chat.id },
  });
};
