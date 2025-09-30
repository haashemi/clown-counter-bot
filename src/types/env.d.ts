declare namespace NodeJS {
  interface ProcessEnv {
    // Telegram Config
    BOT_TOKEN?: string;

    // Database Config
    DB_URL?: string;
  }
}
