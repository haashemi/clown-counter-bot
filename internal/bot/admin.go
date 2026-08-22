package bot

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"slices"
	"strconv"
	"strings"

	"github.com/haashemi/clown-counter-bot/internal/db"
	"github.com/haashemi/clown-counter-bot/internal/tgutils"
	"github.com/haashemi/tgo"
	"github.com/haashemi/tgo/routers/message"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	maxGifs     = 3
	maxStickers = 3
	minCooldown = 5
	maxCooldown = 60
)

// mediaKind identifies which kind of custom clown media is being managed.
type mediaKind string

const (
	mediaGif     mediaKind = "gif"
	mediaSticker mediaKind = "sticker"
)

func (b *Bot) setGif(ctx *message.Context) {
	b.addMedia(ctx, mediaGif)
}

func (b *Bot) setSticker(ctx *message.Context) {
	b.addMedia(ctx, mediaSticker)
}

func (b *Bot) removeGif(ctx *message.Context) {
	b.removeMedia(ctx, mediaGif)
}

func (b *Bot) removeSticker(ctx *message.Context) {
	b.removeMedia(ctx, mediaSticker)
}

// addMedia registers the replied gif/sticker as a clown call for the group.
func (b *Bot) addMedia(ctx *message.Context, kind mediaKind) {
	msg := ctx.Message
	key := "cmd_set" + string(kind)

	if msg.ReplyToMessage == nil {
		b.reply(ctx, key, nil)

		return
	}

	fileID, ok := mediaFileID(msg.ReplyToMessage, kind)
	if !ok {
		b.reply(ctx, key+"_invalid", nil)

		return
	}

	maxMedia := maxGifs
	if kind == mediaSticker {
		maxMedia = maxStickers
	}

	existing, ok := b.loadGroupMedia(msg.Chat.Id, kind)
	if !ok {
		return
	}

	if len(existing) >= maxMedia {
		b.reply(ctx, key+"_limit", nil)

		return
	}

	parsed, parseErr := tgutils.Parse(fileID)
	if parseErr != nil {
		log.Printf("Failed to parse %s file id: %v", kind, parseErr)

		return
	}

	updated := slices.Clone(existing)
	updated = append(updated, strconv.FormatInt(parsed.Id, 10))

	err := b.saveGroupMedia(msg, kind, updated)
	if err != nil {
		log.Printf("Failed to save group: %v", err)

		return
	}

	b.reply(ctx, key+"_done", map[string]any{"count": len(updated), "max": maxMedia})
}

// removeMedia unregisters the replied gif/sticker as a clown call for the group.
func (b *Bot) removeMedia(ctx *message.Context, kind mediaKind) {
	msg := ctx.Message
	key := "cmd_remove" + string(kind)

	if msg.ReplyToMessage == nil {
		b.reply(ctx, key+"_usage", nil)

		return
	}

	fileID, ok := mediaFileID(msg.ReplyToMessage, kind)
	if !ok {
		b.reply(ctx, key+"_invalid", nil)

		return
	}

	parsed, parseErr := tgutils.Parse(fileID)
	if parseErr != nil {
		log.Printf("Failed to parse %s file id: %v", kind, parseErr)

		return
	}

	existing, ok := b.loadGroupMedia(msg.Chat.Id, kind)
	if !ok {
		return
	}

	if len(existing) == 0 {
		b.reply(ctx, key+"_empty", nil)

		return
	}

	target := strconv.FormatInt(parsed.Id, 10)

	if !slices.Contains(existing, target) {
		b.reply(ctx, key+"_not_found", nil)

		return
	}

	updated := slices.DeleteFunc(existing, func(id string) bool { return id == target })

	err := b.saveGroupMedia(msg, kind, updated)
	if err != nil {
		log.Printf("Failed to save group: %v", err)

		return
	}

	b.reply(ctx, key+"_done", nil)
}

// loadGroupMedia loads the configured media ids for the group.
func (b *Bot) loadGroupMedia(groupID int64, kind mediaKind) ([]string, bool) {
	var group db.Group

	err := b.db.Select(mediaColumn(kind)).Where("id = ?", groupID).First(&group).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		log.Printf("Failed to load group: %v", err)

		return nil, false
	}

	return parseFileIds(mediaIDs(group, kind)), true
}

// saveGroupMedia persists the given media ids for the group.
func (b *Bot) saveGroupMedia(msg *tgo.Message, kind mediaKind, ids []string) error {
	var newValue *string

	if len(ids) > 0 {
		idsJSON, err := json.Marshal(ids)
		if err != nil {
			return fmt.Errorf("marshal %s ids: %w", kind, err)
		}

		str := string(idsJSON)
		newValue = &str
	}

	groupData := db.Group{ID: msg.Chat.Id, Name: msg.Chat.Title}
	setMediaIDs(&groupData, kind, newValue)

	err := b.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		DoUpdates: clause.AssignmentColumns([]string{"name", mediaColumn(kind)}),
	}).Create(&groupData).Error
	if err != nil {
		return fmt.Errorf("save group: %w", err)
	}

	return nil
}

// mediaFileID returns the file id of the replied media for the given kind.
func mediaFileID(msg *tgo.Message, kind mediaKind) (string, bool) {
	switch kind {
	case mediaGif:
		if msg.Animation == nil {
			return "", false
		}

		return msg.Animation.FileId, true

	case mediaSticker:
		if msg.Sticker == nil {
			return "", false
		}

		return msg.Sticker.FileId, true
	}

	return "", false
}

func mediaColumn(kind mediaKind) string {
	if kind == mediaGif {
		return "gif_ids"
	}

	return "sticker_ids"
}

func mediaIDs(group db.Group, kind mediaKind) *string {
	if kind == mediaGif {
		return group.GIFIds
	}

	return group.StickerIDs
}

func setMediaIDs(group *db.Group, kind mediaKind, ids *string) {
	if kind == mediaGif {
		group.GIFIds = ids

		return
	}

	group.StickerIDs = ids
}

func (b *Bot) setCooldown(ctx *message.Context) {
	msg := ctx.Message

	fields := strings.Fields(msg.Text)
	args := ""

	if len(fields) > 1 {
		args = strings.Join(fields[1:], " ")
	}

	if args == "" {
		b.reply(ctx, "cmd_setcooldown_usage", nil)

		return
	}

	minutes, err := strconv.Atoi(args)
	if err != nil {
		b.reply(ctx, "cmd_setcooldown_invalid_number", nil)

		return
	}

	if minutes < minCooldown || minutes > maxCooldown {
		b.reply(ctx, "cmd_setcooldown_out_of_range", map[string]any{"min": minCooldown, "max": maxCooldown})

		return
	}

	cooldownMs := int64(minutes) * secondsPerMinute * msPerSecond

	err = b.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		DoUpdates: clause.AssignmentColumns([]string{"name", "cooldown"}),
	}).Create(&db.Group{ID: msg.Chat.Id, Name: msg.Chat.Title, Cooldown: &cooldownMs}).Error
	if err != nil {
		log.Printf("Failed to save group: %v", err)

		return
	}

	b.reply(ctx, "cmd_setcooldown_done", map[string]any{"minutes": minutes})
}
