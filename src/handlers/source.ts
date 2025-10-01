import type { Context } from "grammy";

export const onSource = (ctx: Context) => {
  return ctx.reply(
    `✨ دلقک‌شمار یک پروژه متن‌بازه!

این به این معنیه که شما دسترسی کامل به سورس‌کد این ربات دارین و می‌تونید روی سرور خودتون اجراش کنید، شخصی‌سازیش کنید یا حتی به توسعه‌ش کمک کنید!

🪄 ریپازیتوری پروژه:
https://github.com/haashemi/clown-counter-bot`,
    {
      link_preview_options: { is_disabled: true },
    },
  );
};
