import type { Context, Middleware } from "grammy";

import { CommandGroup } from "@grammyjs/commands";
import { run } from "@grammyjs/runner";
import { Bot as GrammyBot } from "grammy";

import type { Handler } from "@/handlers";

import type { I18nFlavor } from "./plugins/i18n";
import type { ReplyToFlavor } from "./plugins/reply-to";

import { errorHandler } from "./error-handler";
import { autoRetryPlugin } from "./plugins/auto-retry";
import { applyHandlers } from "./registration";

export type ClownCall = "clown" | "unclown";

export type BotContext = Context &
  I18nFlavor &
  ReplyToFlavor & {
    clownCall?: ClownCall;
  };

interface BotOptions {
  plugins: Middleware<BotContext>[];
}

export class Bot extends GrammyBot<BotContext> {
  /**
   * Single group for every command handler: `setCommands` issues one `setMyCommands`
   * per scope, so two groups would overwrite each other's scopes.
   */
  readonly commands = new CommandGroup<BotContext>();

  constructor(token: string, { plugins }: BotOptions) {
    super(token);

    plugins.forEach((plugin) => this.use(plugin));
    this.use(this.commands);

    this.api.config.use(autoRetryPlugin());
  }

  override errorHandler = errorHandler;

  /** Binds every handler passed in — see `applyHandlers`. */
  registerHandlers(...handlers: Handler[]): this {
    applyHandlers(this, this.commands, handlers);
    return this;
  }

  async run() {
    await this.commands.setCommands(this);

    run(this, {
      runner: { fetch: { allowed_updates: ["message", "callback_query"] } },
    });
  }
}

export * from "./filters";
export * from "./plugins";
