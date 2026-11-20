import type { Animation, Chat, Message, Sticker, Update, User, UserFromGetMe } from "grammy/types";

import { join } from "node:path";

import { handlers } from "@/handlers";
import { Bot, i18nMiddleware, replyToMiddleware } from "@/lib/bot";

export interface ApiCall {
  method: string;
  payload: Record<string, unknown>;
}

export const ME: UserFromGetMe = {
  id: 999,
  is_bot: true,
  first_name: "ClownCounter",
  username: "ClownCounterBot",
  can_join_groups: true,
  can_read_all_group_messages: false,
  supports_inline_queries: false,
  can_connect_to_business: false,
  has_main_web_app: false,
  has_topics_enabled: false,
  allows_users_to_create_topics: false,
  can_manage_bots: false,
  supports_join_request_queries: false,
};

let updateId = 0;
let messageId = 0;

function nextUpdateId(): number {
  updateId += 1;
  return updateId;
}

function nextMessageId(): number {
  messageId += 1;
  return messageId;
}

export function user(id: number, firstName: string): User {
  return { id, is_bot: false, first_name: firstName };
}

function chat(id: number, type: "group" | "private" | "supergroup"): Chat {
  return type === "private" ? { id, type, first_name: "x" } : { id, type, title: "Test Group" };
}

export function createTestBot({ admins = [] }: { admins?: number[] } = {}) {
  const bot = new Bot("123:test", {
    plugins: [i18nMiddleware(join(process.cwd(), "locales")), replyToMiddleware],
  });
  bot.botInfo = ME;
  bot.registerHandlers(...handlers);

  const calls: ApiCall[] = [];

  bot.api.config.use((_prev, method, payload) => {
    const p = payload as Record<string, unknown>;
    calls.push({ method, payload: p });

    let result: unknown = true;
    if (method === "sendMessage" || method === "editMessageText") {
      result = {
        message_id: nextMessageId(),
        date: 0,
        chat: { id: p["chat_id"], type: "supergroup" },
        text: p["text"],
      };
    } else if (method === "getChatMember") {
      const userId = p["user_id"] as number;
      result = {
        status: admins.includes(userId) ? "administrator" : "member",
        user: { id: userId, is_bot: false, first_name: "x" },
      };
    }

    return Promise.resolve({ ok: true, result } as never);
  });

  return {
    bot,
    calls,
    send: (update: Update) => bot.handleUpdate(update),
    replies: () => calls.filter((c) => c.method === "sendMessage").map((c) => c.payload["text"] as string),
  };
}

export interface GroupMessageOptions {
  chatId?: number;
  chatType?: "group" | "private" | "supergroup";
  from: User;
  text?: string;
  replyTo?: Message;
  animation?: Animation;
  sticker?: Sticker;
}

export function message({
  chatId = -100123,
  chatType = "supergroup",
  from,
  text,
  replyTo,
  animation,
  sticker,
}: GroupMessageOptions): Message {
  const msg: Record<string, unknown> = {
    message_id: nextMessageId(),
    date: Math.floor(Date.now() / 1000),
    chat: chat(chatId, chatType),
    from,
  };

  if (text !== undefined) {
    msg["text"] = text;
    if (text.startsWith("/")) {
      msg["entities"] = [{ type: "bot_command", offset: 0, length: text.split(/\s/)[0]!.length }];
    }
  }
  if (replyTo) msg["reply_to_message"] = replyTo;
  if (animation) msg["animation"] = animation;
  if (sticker) msg["sticker"] = sticker;

  return msg as unknown as Message;
}

export function groupMessage(opts: GroupMessageOptions): Update {
  // `message()` builds a plain `Message`; `Update.message` narrows it to non-channel chats.
  const update = { update_id: nextUpdateId(), message: message(opts) };
  return update as Update;
}

export function callbackQuery({ from, data, message: msg }: { from: User; data: string; message: Message }): Update {
  const id = nextUpdateId();
  const callback = { id: String(id), from, data, message: msg, chat_instance: "1" };

  return { update_id: id, callback_query: callback };
}
