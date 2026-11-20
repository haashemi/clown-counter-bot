import { eq } from "drizzle-orm";

import type { CommandHandler } from "@/handlers";
import type { BotContext } from "@/lib/bot";

import { db, schema } from "@/db";
import { GROUP } from "@/lib/bot";
import { isSameDay } from "@/lib/date";

const MIN_QUANTITY = 5;
const MAX_QUANTITY = 20;

async function clownOfTheDay(ctx: BotContext) {
  const { message } = ctx;
  if (!message) return;

  const groupId = message.chat.id;

  // Once per group per day: blocks if the latest system vote (voterId IS NULL) is from today (TIME_ZONE).
  const recent = await db.query.clownVotes.findFirst({
    columns: { votedAt: true },
    where: (f, o) => o.and(o.eq(f.groupId, groupId), o.isNull(f.voterId)),
    orderBy: (f, o) => [o.desc(f.votedAt)],
  });

  if (recent && isSameDay(recent.votedAt, new Date())) {
    return ctx.replyTo(message, ctx.t("cmd_clown_of_the_day_wait"));
  }

  // Candidates: users who were clowned in this group at least once.
  const rows = await db
    .selectDistinct({ id: schema.users.id, name: schema.users.name })
    .from(schema.clownVotes)
    .innerJoin(schema.users, eq(schema.users.id, schema.clownVotes.clownId))
    .where(eq(schema.clownVotes.groupId, groupId));

  if (rows.length === 0) {
    return ctx.replyTo(message, ctx.t("cmd_clown_of_the_day_no_users"));
  }

  const clown = rows[Math.floor(Math.random() * rows.length)]!;
  const quantity = MIN_QUANTITY + Math.floor(Math.random() * (MAX_QUANTITY - MIN_QUANTITY + 1));

  await db.insert(schema.clownVotes).values({
    groupId,
    voterId: null,
    clownId: clown.id,
    quantity,
  });

  return ctx.replyTo(message, ctx.t("cmd_clown_of_the_day", { clown: clown.name, quantity }));
}

export const clownOfTheDayHandler: CommandHandler = {
  kind: "command",
  name: "clownoftheday",
  description: "👑 دلقک روز",
  scopes: GROUP,
  handler: clownOfTheDay,
};
