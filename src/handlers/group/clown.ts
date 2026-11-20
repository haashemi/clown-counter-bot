import type { User } from "grammy/types";

import { and, desc, eq, sql } from "drizzle-orm";

import type { CommandHandler, Handler, MessageHandler } from "@/handlers";
import type { BotContext } from "@/lib/bot";

import { db, saveGroup, schema } from "@/db";
import { GROUP } from "@/lib/bot";

import { isClownCall } from "./clown-filter";

const DEFAULT_COOLDOWN = 10 * 60 * 1000;

interface Data {
  group: { id: number; name: string };
  voter: { id: number; name: string };
  clown: { id: number; name: string; isBot: boolean };
}

function displayName(user: User): string {
  return user.last_name ? `${user.first_name} ${user.last_name}` : user.first_name;
}

function getData(ctx: BotContext): Data | null {
  if (!ctx.message) return null;

  const voter = ctx.message.from;
  const replied = ctx.message.reply_to_message;
  // In forum topics every message "replies" to the topic-created service message.
  const clown = replied?.forum_topic_created ? undefined : replied?.from;

  if (!clown || !voter) return null;

  return {
    group: { id: ctx.message.chat.id, name: ctx.message.chat.title ?? "" },
    voter: { id: voter.id, name: displayName(voter) },
    clown: { id: clown.id, name: displayName(clown), isBot: clown.is_bot },
  };
}

/** Cooldown check (races prevented by `sequentialize` in `Bot`): returns the wait in minutes, or 0 when allowed. */
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

  const { group, voter, clown } = data;

  const prefix = quantity > 0 ? "cmd_clown" : "cmd_unclown";

  const reply = (text: string) => ctx.replyTo(ctx.msg, text);

  const rejection = clown.id === ctx.me.id ? "is_me" : clown.isBot ? "is_bot" : voter.id === clown.id ? "is_you" : null;

  if (rejection) return reply(ctx.t(`${prefix}_${rejection}`));

  // Upsert both users in one statement, and the group concurrently.
  await Promise.all([
    db
      .insert(schema.users)
      .values([
        { id: voter.id, name: voter.name },
        { id: clown.id, name: clown.name },
      ])
      .onConflictDoUpdate({ target: schema.users.id, set: { name: sql`excluded.name` } }),
    saveGroup(group.id, group.name),
  ]);

  const waitMin = await waitMinutes(data);

  if (waitMin > 0) {
    return reply(ctx.t(`${prefix}_wait`, { waitMin }));
  }

  await db.insert(schema.clownVotes).values({
    groupId: group.id,
    voterId: voter.id,
    clownId: clown.id,
    quantity,
  });

  return reply(ctx.t(prefix, { clown: clown.name, voter: voter.name }));
}

function clownHandler(ctx: BotContext) {
  return voteHandler(ctx, 1);
}

function unclownHandler(ctx: BotContext) {
  return voteHandler(ctx, -1);
}

/** `/clown` — same vote as the 🤡 text trigger. */
export const cmdClown: CommandHandler = {
  kind: "command",
  name: "clown",
  description: "🤡 عه یه دلقک!",
  scopes: GROUP,
  handler: clownHandler,
};

/** `/unclown` — same vote as the 😇 text trigger. */
export const cmdUnclown: CommandHandler = {
  kind: "command",
  name: "unclown",
  description: "💀 یکی آدم شده",
  scopes: GROUP,
  handler: unclownHandler,
};

/** The 🤡/دلقک/😇/ستون text + configured gif/sticker flow. */
export const clownMessageHandler: MessageHandler = {
  kind: "message",
  inGroup: true,
  filter: isClownCall,
  handler: async (ctx) => (ctx.clownCall === "clown" ? clownHandler(ctx) : unclownHandler(ctx)),
};

export const clownHandlers: Handler[] = [cmdClown, cmdUnclown, clownMessageHandler];
