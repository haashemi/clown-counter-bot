import { autoRetry } from "@grammyjs/auto-retry";

export function autoRetryPlugin() {
  return autoRetry();
}
