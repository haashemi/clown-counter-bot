import type { Context } from "grammy";
import type { User } from "grammy/types";

import { clownVotesTable, db, groupsTable, usersTable } from "@/db";

const CLOWN_DELAY = 10 * 60 * 1000;

interface Data {
  messageId: number;
  group: { id: number; name: string };
  voter: User & { name: string };
  clown: User & { name: string };
}

const getData = (ctx: Context): Data | null => {
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

const canInsert = async ({ group: { id }, voter }: Data): Promise<boolean> => {
  const res = await db.query.clownVotesTable.findFirst({
    columns: { votedAt: true },
    where: (f, o) => o.and(o.eq(f.groupId, id), o.eq(f.voterId, voter.id)),
    orderBy: (f, o) => o.desc(f.votedAt),
  });

  if (!res) return true;

  return new Date().getTime() - new Date(res.votedAt).getTime() > CLOWN_DELAY;
};

export const onClown = async (ctx: Context) => {
  const data = getData(ctx);
  if (!data) return;

  const { messageId, group, voter, clown } = data;

  if (clown.id === ctx.me.id) {
    return ctx.reply(
      `🤡 آره داداش بذار ربات رو دلقک کنم خیلی کار باحالیه به ذهن کسی هم نمی‌رسه ای وای که چقدر باهوشم من. پر از هوش و ذکاوت و استعداد نهفته.\n\n🙏 هرکیو بتونی دلقک کنی منو نمی‌تونی.`,
      { reply_parameters: { message_id: messageId, chat_id: group.id } },
    );
  } else if (clown.is_bot) {
    return ctx.reply(`😂 ربات رو می‌خوای دلقک کنی؟ جدی؟ تو دیگه شاهکاری!`, {
      reply_parameters: { message_id: messageId, chat_id: group.id },
    });
  } else if (voter.id === clown.id) {
    return ctx.reply(`واقعا می‌خوای خودتو دلقک کنی؟ تو دیگه خیلی دلقکی. 😭`, {
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

  if (!(await canInsert(data))) {
    return ctx.reply(`دلقک یه ${CLOWN_DELAY / 60 / 1000} دقیقه صبر کن حداقل. 😭`, {
      reply_parameters: { message_id: messageId, chat_id: group.id },
    });
  }

  await db.insert(clownVotesTable).values({
    groupId: group.id,
    voterId: voter.id,
    clownId: clown.id,
  });

  ctx.reply(`\u200F🤡 ${voter.name} کاربر ${clown.name} رو دلقک تر کرد!`, {
    reply_parameters: { message_id: messageId, chat_id: group.id },
  });
};
