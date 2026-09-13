import type { BotContext } from "..";

/** `true` for group admins, including anonymous admins posting as the group itself. */
export async function isAdmin(ctx: BotContext): Promise<boolean> {
  if (!ctx.chat) return false;

  if (ctx.senderChat?.id === ctx.chat.id) {
    return true;
  }

  const author = await ctx.getAuthor();

  return ["administrator", "creator"].includes(author.status);
}
