import type { BotCommandScope } from "grammy/types";

export const PRIVATE: BotCommandScope[] = [{ type: "all_private_chats" }];
export const ADMIN: BotCommandScope[] = [{ type: "all_chat_administrators" }];
/** Group commands are added to the admin scope too: Telegram shows admins only the most specific list. */
export const GROUP: BotCommandScope[] = [{ type: "all_group_chats" }, ...ADMIN];
