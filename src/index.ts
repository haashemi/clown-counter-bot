import { count, desc, eq } from "drizzle-orm";
import { Bot } from "grammy";

import { config } from "@/config";
import { clownsTable, clownVotesTable, db, usersTable } from "@/db";

const bot = new Bot(config.botToken);

bot.command("start", (ctx) => {
  ctx.reply("سلام! من دلقک شمارم. من رو به گروهت اضافه کن و روی دلقک مورد نظر با کامند /clown ریپلای کن!");
});

bot.command("clown", async (ctx) => {
  const message = ctx.message;
  if (!message) return;

  const clown = message.reply_to_message?.from;
  if (!clown) return;

  const sender = message.from;
  if (!sender) return;

  const clownName = `${clown.first_name}${clown.last_name ? ` ${clown.last_name}` : ""}`;
  const senderName = `${sender.first_name}${sender.last_name ? ` ${sender.last_name}` : ""}`;

  const dbClown = await db
    .insert(clownsTable)
    .values({
      tgId: sender.id,
      name: clownName,
      groupId: message.chat.id,
    })
    .onConflictDoUpdate({
      target: [clownsTable.tgId, clownsTable.groupId],
      set: { name: clownName },
    })
    .returning({ id: clownsTable.id });

  const dbUser = await db
    .insert(usersTable)
    .values({ tgId: sender.id, name: senderName })
    .onConflictDoUpdate({
      target: usersTable.tgId,
      set: { name: senderName },
    })
    .returning({
      id: usersTable.id,
    });

  if (!dbClown[0] || !dbUser[0]) return;

  await db
    .insert(clownVotesTable)
    .values({
      clownId: dbClown[0].id,
      voterId: dbUser[0].id,
    })
    .onConflictDoNothing();

  ctx.reply(`🤡 دلقک انتخابی شما به ${clownName} تغییر کرد.`, {
    reply_parameters: { message_id: message.message_id, chat_id: message.chat.id },
  });
});

bot.command("stats", async (ctx) => {
  const message = ctx.message;
  if (!message) return;

  const clowns = await db
    .select({
      name: clownsTable.name,
      count: count(clownVotesTable.id),
    })
    .from(clownVotesTable)
    .leftJoin(clownsTable, eq(clownsTable.id, clownVotesTable.clownId))
    .groupBy(clownsTable.id)
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
});

await bot.api.setMyCommands([{ command: "stats", description: "استارت دلقک‌شماری رو بزن" }], {
  scope: { type: "all_private_chats" },
});

await bot.api.setMyCommands(
  [
    { command: "clown", description: "دلقک گروه رو انتخاب کن" },
    { command: "stats", description: "لیست دلقک‌های برتر گروه" },
  ],
  { scope: { type: "all_group_chats" } },
);

// eslint-disable-next-line no-console
bot.catch(console.error);

bot.start();
