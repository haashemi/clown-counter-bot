package main

import (
	"log"

	"github.com/haashemi/clown-counter-bot/internal/bot"
	"github.com/haashemi/clown-counter-bot/internal/config"
	"github.com/haashemi/clown-counter-bot/internal/db"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalln("Invalid config:", err)
	}

	database, err := db.Open(cfg.DBFilePath)
	if err != nil {
		log.Fatalln("Failed to open the database:", err)
	}

	b, err := bot.New(cfg.BotToken, database)
	if err != nil {
		log.Fatalln("Failed to create the bot:", err)
	}

	log.Println("Bot started as", b.Me.Username)

	err = b.Run()
	if err != nil {
		log.Fatalln("Polling failed:", err)
	}
}
