package config

import (
	"errors"
	"fmt"
	"os"
	"regexp"

	"github.com/goccy/go-yaml"
)

var (
	ErrBotTokenRequired = errors.New("BOT_TOKEN is required")
	ErrBotTokenInvalid  = errors.New("BOT_TOKEN is invalid")
)

var tokenRegex = regexp.MustCompile(`^\d{10}:.+`)

type Config struct {
	BotToken   string `yaml:"bot_token"`
	DBFilePath string `yaml:"db_file_path"`
}

// Load reads the configuration from the config.yaml file.
func Load() (*Config, error) {
	f, err := os.Open("config.yaml")
	if err != nil {
		return nil, fmt.Errorf("open config file: %w", err)
	}

	defer func() {
		_ = f.Close()
	}()

	cfg := &Config{}

	err = yaml.NewDecoder(f).Decode(cfg)
	if err != nil {
		return nil, fmt.Errorf("decode config file: %w", err)
	}

	if cfg.BotToken == "" {
		return nil, ErrBotTokenRequired
	}

	if len(cfg.BotToken) != 46 || !tokenRegex.MatchString(cfg.BotToken) {
		return nil, ErrBotTokenInvalid
	}

	if cfg.DBFilePath == "" {
		cfg.DBFilePath = "database.sqlite"
	}

	return &Config{
		BotToken:   cfg.BotToken,
		DBFilePath: cfg.DBFilePath,
	}, nil
}
