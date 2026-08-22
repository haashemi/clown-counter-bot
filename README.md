# 🤡 Clown Counter

Clown Counter is a really simple but fun Telegram bot written in a night just for fun.

The whole purpose of this bot is to increase a "How clown they are" near the name of your friends in your group chats.

## Commands

## Private chat

| Command    | Description                                                             |
| ---------- | ----------------------------------------------------------------------- |
| `/start`   | Starts the bot in the private chat, nothing special                     |
| `/privacy` | Describes what this bot stores and how it works for the sake of privacy |
| `/source`  | Sends you the URL of this repository                                    |

## Group chat

| Command                | Description                                    |
| ---------------------- | ---------------------------------------------- |
| `/stats`               | Lists the chat clowns in descending order      |
| `/clown`, `🤡`, `دلقک` | Increments the clown score of the replied user |

## Self Host

This bot is written in Go and uses [tgo](https://github.com/haashemi/tgo) as its Telegram framework and [GORM](https://gorm.io) for the database. Just install `Go`, update the `.env` variables (use `.env.example` as an example), then run these commands:

```sh
go build
./clown-counter-bot
```
