# 🤡 Clown Counter

Clown Counter is a really simple but fun Telegram bot written in a night just for fun.

The whole purpose of this bot is to increase a "How clown they are" near the name of your friends in your group chats.

## Commands

### Private chat

| Command    | Description                                    |
| ---------- | ---------------------------------------------- |
| `/start`   | Introduces the bot                             |
| `/privacy` | Describes what the bot stores and how it works |
| `/source`  | Sends the URL of this repository               |

### Group chat

Reply to someone's message with one of these:

| Command / trigger                                                        | Description                                    |
| ------------------------------------------------------------------------ | ---------------------------------------------- |
| `/clown`, `🤡`, `دلقک`, or the group's clown gif/sticker                 | Adds a clown point to the replied user         |
| `/unclown`, `😇`, `ستون`, `آدم عاقل`, or the group's unclown gif/sticker | Removes a clown point from the replied user    |
| `/stats`                                                                 | Lists the group's clowns in descending order   |
| `/clownoftheday`                                                         | Picks a random clown of the day (once per day) |

Text and gif/sticker triggers only work when the bot can read group messages: make it an admin (Telegram privacy mode).

### Group admins

| Command                                       | Description                                                    |
| --------------------------------------------- | -------------------------------------------------------------- |
| `/setgif`, `/removegif`                       | Reply to a gif to add/remove it as a clown trigger (max 3)     |
| `/setsticker`, `/removesticker`               | Reply to a sticker to add/remove it as a clown trigger (max 3) |
| `/setunclowngif`, `/removeunclowngif`         | Same, for unclown gifs                                         |
| `/setunclownsticker`, `/removeunclownsticker` | Same, for unclown stickers                                     |
| `/setcooldown <0–60>`                         | Sets the minutes a user must wait between votes                |
| `/resetstats`                                 | Resets the group's stats (asks for confirmation)               |

## Self Host

This bot is a Node.js application. Install Node.js and pnpm, then:

```sh
pnpm install
cp .env.example .env   # fill in BOT_TOKEN and DATABASE_URL
pnpm build
pnpm start
```

Database migrations run automatically on startup.
