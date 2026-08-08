import { CommandGroup } from "@grammyjs/commands";

import type { BotContext } from "@/lib/bot";

import { cmdRemoveGif } from "./admin/removegif";
import { cmdRemoveSticker } from "./admin/removesticker";
import { cmdSetCooldown } from "./admin/setcooldown";
import { cmdSetGif } from "./admin/setgif";
import { cmdSetSticker } from "./admin/setsticker";
import { cmdClown } from "./clown";
import { cmdStats } from "./public/stats";
import { cmdPrivacy } from "./static/privacy";
import { cmdSource } from "./static/source";
import { cmdStart } from "./static/start";

export const commands = new CommandGroup<BotContext>().add([
  // Static
  cmdStart,
  cmdSource,
  cmdPrivacy,

  // Magic
  cmdClown,

  // Public
  cmdStats,

  // Admin
  cmdSetGif,
  cmdRemoveGif,
  cmdSetSticker,
  cmdRemoveSticker,
  cmdSetCooldown,
]);
