import type { Context, Middleware } from "grammy";

import { autoRetry } from "@grammyjs/auto-retry";
import { CommandGroup } from "@grammyjs/commands";
import { run, sequentialize } from "@grammyjs/runner";
import { Bot as GrammyBot } from "grammy";

import type { Handler } from "@/handlers";

import type { I18nFlavor } from "./plugins/i18n";
import type { ReplyToFlavor } from "./plugins/reply-to";

import { errorHandler } from "./error-handler";
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

    // Updates of one chat run one at a time (no check-then-write races); other chats stay concurrent.
    this.use(sequentialize((ctx) => ctx.chat?.id.toString()));
    plugins.forEach((plugin) => this.use(plugin));
    this.use(this.commands);

    this.api.config.use(autoRetry());
  }

  override errorHandler = errorHandler;

  /** Binds every handler passed in — see `applyHandlers`. */
  registerHandlers(...handlers: Handler[]): this {
    applyHandlers(this, this.commands, handlers);
    return this;
  }

  /** Starts polling and resolves after SIGINT/SIGTERM has stopped the runner. */
  async run() {
    await this.commands.setCommands(this);

    const runner = run(this, {
      runner: { fetch: { allowed_updates: ["message", "callback_query"] } },
    });

    const stop = () => void runner.stop();
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);

    await runner.task();
  }
}

export * from "./filters";
export * from "./plugins";
export * from "./scopes";
