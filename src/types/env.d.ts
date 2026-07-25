declare namespace NodeJS {
  interface ProcessEnv {
    // Telegram Config
    BOT_TOKEN?: string;
    BOT_SUPERUSER?: string;

    // Database Config
    DB_FILE_PATH?: string;
  }
}
