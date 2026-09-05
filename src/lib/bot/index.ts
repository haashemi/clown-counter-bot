import type { CommandGroup } from "@grammyjs/commands";
import type { Context, Middleware } from "grammy";

import { run } from "@grammyjs/runner";
import { Bot as GrammyBot } from "grammy";

import type { I18nFlavor } from "./plugins/i18n";
import type { ReplyToFlavor } from "./plugins/reply-to";

import { errorHandler } from "./error-handler";
import { autoRetryPlugin } from "./plugins/auto-retry";

export type ClownCall = "clown" | "unclown";

export type BotContext = Context &
  I18nFlavor &
  ReplyToFlavor & {
    clownCall?: ClownCall;
  };

interface BotOptions {
  plugins: Middleware<BotContext>[];
  commands: CommandGroup<BotContext>;
}

export class Bot extends GrammyBot<BotContext> {
  commands: CommandGroup<BotContext>;

  constructor(token: string, { plugins, commands }: BotOptions) {
    super(token);
    this.commands = commands;

    plugins.forEach((plugin) => this.use(plugin));
    this.use(commands);

    this.api.config.use(autoRetryPlugin());
  }

  override errorHandler = errorHandler;

  async run() {
    this.commands.setCommands(this);

    run(this, {
      runner: { fetch: { allowed_updates: ["message", "callback_query"] } },
    });
  }
}
