import { CommandGroup } from "@grammyjs/commands";

import type { BotContext } from "@/lib/bot";

import { cmdRemoveGif, cmdRemoveSticker, cmdRemoveUnclownGif, cmdRemoveUnclownSticker } from "./admin/media-remove";
import { cmdSetGif, cmdSetSticker, cmdSetUnclownGif, cmdSetUnclownSticker } from "./admin/media-set";
import { cmdResetStats } from "./admin/resetstats";
import { cmdSetCooldown } from "./admin/setcooldown";
import { cmdClown, cmdUnclown } from "./clown";
import { cmdClownOfTheDay } from "./public/clownoftheday";
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
  cmdUnclown,

  // Public
  cmdStats,
  cmdClownOfTheDay,

  // Admin
  cmdResetStats,
  cmdSetCooldown,
  cmdRemoveGif,
  cmdRemoveSticker,
  cmdRemoveUnclownGif,
  cmdRemoveUnclownSticker,
  cmdSetGif,
  cmdSetSticker,
  cmdSetUnclownGif,
  cmdSetUnclownSticker,
]);
