import type { User } from "grammy/types";

import { and, desc, eq, sql } from "drizzle-orm";

import type { BotContext } from "@/lib/bot";

import { db, schema } from "@/db";

const DEFAULT_COOLDOWN = 10 * 60 * 1000;

interface Data {
  messageId: number;
  group: { id: number; name: string };
  voter: User & { name: string };
  clown: User & { name: string };
}

function displayName(user: User): string {
  return user.last_name ? `${user.first_name} ${user.last_name}` : user.first_name;
}

function getData(ctx: BotContext): Data | null {
  if (!ctx.message) return null;

  const voter = ctx.message.from;
  const clown = ctx.message.reply_to_message?.from;

  if (!clown || !voter) return null;

  return {
    messageId: ctx.message.message_id,
    group: { id: ctx.message.chat.id, name: ctx.message.chat.title ?? "" },
    voter: { ...voter, name: displayName(voter) },
    clown: { ...clown, name: displayName(clown) },
  };
}

/** Race-free cooldown check: returns the wait in minutes, or 0 when allowed. */
async function waitMinutes({ group: { id }, voter }: Data): Promise<number> {
  const group = await db.query.groups.findFirst({
    columns: { cooldown: true },
    where: (f, o) => o.eq(f.id, id),
  });

  const cooldown = group?.cooldown ?? DEFAULT_COOLDOWN;

  const [last] = await db
    .select({ votedAt: schema.clownVotes.votedAt })
    .from(schema.clownVotes)
    .where(and(eq(schema.clownVotes.groupId, id), eq(schema.clownVotes.voterId, voter.id)))
    .orderBy(desc(schema.clownVotes.votedAt))
    .limit(1);

  if (!last) return 0;

  const diff = Date.now() - last.votedAt.getTime();

  return diff > cooldown ? 0 : Math.ceil((cooldown - diff) / 1000 / 60);
}

async function voteHandler(ctx: BotContext, quantity: -1 | 1) {
  const data = getData(ctx);
  if (!data) return;

  const { messageId, group, voter, clown } = data;

  const prefix = quantity > 0 ? "cmd_clown" : "cmd_unclown";

  const reply = (text: string) => ctx.reply(text, { reply_parameters: { message_id: messageId, chat_id: group.id } });

  const rejection =
    clown.id === ctx.me.id ? "is_me" : clown.is_bot ? "is_bot" : voter.id === clown.id ? "is_you" : null;

  if (rejection) return await reply(ctx.t(`${prefix}_${rejection}`));

  // Upsert both users in one statement, and the group concurrently.
  await Promise.all([
    db
      .insert(schema.users)
      .values([
        { id: voter.id, name: voter.name },
        { id: clown.id, name: clown.name },
      ])
      .onConflictDoUpdate({ target: schema.users.id, set: { name: sql`excluded.name` } }),
    db
      .insert(schema.groups)
      .values({ id: group.id, name: group.name })
      .onConflictDoUpdate({ target: schema.groups.id, set: { name: group.name } }),
  ]);

  const waitMin = await waitMinutes(data);

  if (waitMin > 0) {
    return await reply(ctx.t(`${prefix}_wait`, { waitMin }));
  }

  await db.insert(schema.clownVotes).values({
    groupId: group.id,
    voterId: voter.id,
    clownId: clown.id,
    quantity,
  });

  return await reply(ctx.t(`${prefix}`, { clown: clown.name, voter: voter.name }));
}

export function clownHandler(ctx: BotContext) {
  return voteHandler(ctx, 1);
}

export function unclownHandler(ctx: BotContext) {
  return voteHandler(ctx, -1);
}
