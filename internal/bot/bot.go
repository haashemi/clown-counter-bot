package bot

import (
	"encoding/json"
	"fmt"
	"log"

	"github.com/haashemi/clown-counter-bot/internal/i18n"
	"github.com/haashemi/tgo"
	"github.com/haashemi/tgo/filters"
	"github.com/haashemi/tgo/routers/message"
	"gorm.io/gorm"
)

const (
	defaultCooldown    = 10 * 60 * 1000
	secondsPerMinute   = 60
	msPerSecond        = 1000
	pollTimeoutSeconds = 30
)

// Bot wraps the tgo bot along with the bot's own info, database and messages.
type Bot struct {
	*tgo.Bot

	Me   *tgo.User
	I18n *i18n.I18n

	db *gorm.DB
}

// New creates the bot, registers the routers and returns it.
func New(token string, database *gorm.DB) (*Bot, error) {
	tgbot := tgo.NewBot(token, tgo.Options{})

	me, err := tgbot.GetMe()
	if err != nil {
		return nil, fmt.Errorf("get bot info: %w", err)
	}

	b := &Bot{Bot: tgbot, Me: me, I18n: i18n.New(), db: database}

	mr := message.NewRouter()

	// Static commands
	mr.Handle(filters.And(filters.IsPrivate(), filters.Command("start", me.Username)), b.start)
	mr.Handle(filters.And(filters.IsPrivate(), filters.Command("source", me.Username)), b.source)
	mr.Handle(filters.And(filters.IsPrivate(), filters.Command("privacy", me.Username)), b.privacy)

	// Public commands
	mr.Handle(filters.And(isGroupChat(), filters.Command("stats", me.Username)), b.stats)

	// Admin commands
	mr.Handle(filters.And(isGroupChat(), filters.Command("setgif", me.Username)), b.setGif, b.isAdmin)
	mr.Handle(filters.And(isGroupChat(), filters.Command("removegif", me.Username)), b.removeGif, b.isAdmin)
	mr.Handle(filters.And(isGroupChat(), filters.Command("setsticker", me.Username)), b.setSticker, b.isAdmin)
	mr.Handle(filters.And(isGroupChat(), filters.Command("removesticker", me.Username)), b.removeSticker, b.isAdmin)
	mr.Handle(filters.And(isGroupChat(), filters.Command("setcooldown", me.Username)), b.setCooldown, b.isAdmin)

	// Clown command
	mr.Handle(filters.And(isGroupChat(), filters.Command("clown", me.Username)), b.clownHandler)

	// Magic clown calls: text, gifs and stickers
	mr.Handle(filters.And(isGroupChat(), filters.IsMessage()), b.clownHandler, b.isClownCall)

	err = tgbot.AddRouter(mr)
	if err != nil {
		return nil, fmt.Errorf("add router: %w", err)
	}

	return b, nil
}

// Run registers the bot commands and starts the long-polling.
func (b *Bot) Run() error {
	b.setCommands()

	err := b.StartPolling(pollTimeoutSeconds, "message")
	if err != nil {
		return fmt.Errorf("start polling: %w", err)
	}

	return nil
}

// t returns the translated message for the given key.
func (b *Bot) t(key string, vars map[string]any) string {
	return b.I18n.T(key, vars)
}

// reply sends a translated text message as a reply to the current message.
func (b *Bot) reply(ctx *message.Context, key string, vars map[string]any) {
	_, err := ctx.Reply(&tgo.SendMessage{Text: b.t(key, vars)})
	if err != nil {
		log.Printf("Failed to reply: %v", err)
	}
}

func (b *Bot) logReplyErr(err error) {
	log.Printf("Failed to reply: %v", err)
}

func (b *Bot) setCommands() {
	private := []*tgo.BotCommand{
		{Command: "start", Description: "🎉 شروع دلقک بازی"},
		{Command: "source", Description: "🪄 سورس‌کد ربات"},
		{Command: "privacy", Description: "🔒 حریم شخصی"},
	}

	group := []*tgo.BotCommand{
		{Command: "clown", Description: "🤡 عه یه دلقک!"},
		{Command: "stats", Description: "📊 آمار دلقک‌شماری"},
	}

	admin := []*tgo.BotCommand{
		{Command: "clown", Description: "🤡 عه یه دلقک!"},
		{Command: "stats", Description: "📊 آمار دلقک‌شماری"},
		{Command: "setgif", Description: "🛡 تنظیم گیف دلقک‌کننده گروه"},
		{Command: "removegif", Description: "🛡 حذف گیف دلقک‌کننده گروه"},
		{Command: "setsticker", Description: "🛡 تنظیم استیکر دلقک‌کننده گروه"},
		{Command: "removesticker", Description: "🛡 حذف استیکر دلقک‌کننده گروه"},
		{Command: "setcooldown", Description: "⏱ تنظیم زمان انتظار دلقک"},
	}

	_, err := b.SetMyCommands(&tgo.SetMyCommands{
		Commands: private,
		Scope:    &tgo.BotCommandScopeAllPrivateChats{Type: "all_private_chats"},
	})
	if err != nil {
		log.Printf("Failed to set private commands: %v", err)
	}

	_, err = b.SetMyCommands(&tgo.SetMyCommands{
		Commands: group,
		Scope:    &tgo.BotCommandScopeAllGroupChats{Type: "all_group_chats"},
	})
	if err != nil {
		log.Printf("Failed to set group commands: %v", err)
	}

	_, err = b.SetMyCommands(&tgo.SetMyCommands{
		Commands: admin,
		Scope:    &tgo.BotCommandScopeAllChatAdministrators{Type: "all_chat_administrators"},
	})
	if err != nil {
		log.Printf("Failed to set admin commands: %v", err)
	}
}

func isGroupChat() *filters.Filter {
	return filters.NewFilter(func(update *tgo.Update) bool {
		if msg := update.Message; msg != nil {
			return msg.Chat.Type == "group" || msg.Chat.Type == "supergroup"
		}

		return false
	})
}

func parseFileIds(raw *string) []string {
	if raw == nil {
		return nil
	}

	var ids []string

	err := json.Unmarshal([]byte(*raw), &ids)
	if err != nil {
		return nil
	}

	return ids
}

func fullName(user *tgo.User) string {
	name := user.FirstName
	if user.LastName != "" {
		name += " " + user.LastName
	}

	return name
}
