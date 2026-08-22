package bot

import (
	"errors"
	"log"
	"math"
	"slices"
	"strconv"
	"time"

	"github.com/haashemi/clown-counter-bot/internal/db"
	"github.com/haashemi/clown-counter-bot/internal/tgutils"
	"github.com/haashemi/tgo"
	"github.com/haashemi/tgo/routers/message"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	clownEmoji    = "🤡"
	clownWord     = "دلقک"
	votedAtLayout = "2006-01-02T15:04:05.000Z07:00"
)

// isClownCall is a middleware which detects whether the received group message
// is a clown call (a magic text, or a configured gif/sticker).
func (b *Bot) isClownCall(ctx *message.Context) bool {
	msg := ctx.Message

	if msg.Text == clownEmoji || msg.Text == clownWord {
		return true
	}

	var group db.Group

	err := b.db.Select("gif_ids", "sticker_ids").Where("id = ?", msg.Chat.Id).First(&group).Error
	if err != nil {
		return false
	}

	return b.isClownMedia(msg, parseFileIds(group.GIFIds), parseFileIds(group.StickerIDs))
}

// isClownMedia reports whether the message is a configured clown gif/sticker.
func (b *Bot) isClownMedia(msg *tgo.Message, gifIDs, stickerIDs []string) bool {
	if msg.Animation != nil && msg.Animation.FileId != "" {
		parsed, err := tgutils.Parse(msg.Animation.FileId)
		if err == nil && slices.Contains(gifIDs, strconv.FormatInt(parsed.Id, 10)) {
			return true
		}
	}

	if msg.Sticker != nil && msg.Sticker.FileId != "" {
		parsed, err := tgutils.Parse(msg.Sticker.FileId)
		if err == nil && slices.Contains(stickerIDs, strconv.FormatInt(parsed.Id, 10)) {
			return true
		}
	}

	return false
}

// isAdmin is a middleware which checks whether the message's sender is an
// administrator (or the owner) of the chat.
func (b *Bot) isAdmin(ctx *message.Context) bool {
	msg := ctx.Message

	if msg.SenderChat != nil && msg.SenderChat.Id == msg.Chat.Id {
		return true
	}

	if msg.From == nil {
		return false
	}

	member, err := b.GetChatMember(&tgo.GetChatMember{
		ChatId: tgo.ID(msg.Chat.Id),
		UserId: msg.From.Id,
	})
	if err != nil {
		return false
	}

	switch member.(type) {
	case *tgo.ChatMemberOwner, *tgo.ChatMemberAdministrator:
		return true
	}

	return false
}

func (b *Bot) clownHandler(ctx *message.Context) {
	msg := ctx.Message

	clown := msg.ReplyToMessage
	voter := msg.From

	if clown == nil || clown.From == nil || voter == nil {
		return
	}

	clownUser := clown.From
	groupID := msg.Chat.Id
	groupName := msg.Chat.Title

	switch {
	case clownUser.Id == b.Me.Id:
		b.reply(ctx, "cmd_clown_is_me", nil)

		return

	case clownUser.IsBot:
		b.reply(ctx, "cmd_clown_is_bot", nil)

		return

	case voter.Id == clownUser.Id:
		b.reply(ctx, "cmd_clown_is_you", nil)

		return
	}

	voterName := fullName(voter)
	clownName := fullName(clownUser)

	b.upsertUser(voter.Id, voterName)
	b.upsertUser(clownUser.Id, clownName)
	b.upsertGroup(groupID, groupName)

	allowed, waitMin := b.canInsert(groupID, voter.Id)
	if !allowed {
		b.reply(ctx, "cmd_clown_wait", map[string]any{"waitMin": waitMin})

		return
	}

	voterID := voter.Id

	err := b.db.Create(&db.ClownVote{
		GroupID: groupID,
		VoterID: &voterID,
		ClownID: clownUser.Id,
		VotedAt: time.Now().UTC().Format(votedAtLayout),
	}).Error
	if err != nil {
		log.Printf("Failed to insert clown vote: %v", err)

		return
	}

	b.reply(ctx, "cmd_clown", map[string]any{"clown": clownName, "voter": voterName})
}

func (b *Bot) upsertUser(id int64, name string) {
	_ = b.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		DoUpdates: clause.AssignmentColumns([]string{"name"}),
	}).Create(&db.User{ID: id, Name: name}).Error
}

func (b *Bot) upsertGroup(id int64, name string) {
	_ = b.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		DoUpdates: clause.AssignmentColumns([]string{"name"}),
	}).Create(&db.Group{ID: id, Name: name}).Error
}

func (b *Bot) getGroupCooldown(groupID int64) int64 {
	var group db.Group

	err := b.db.Select("cooldown").Where("id = ?", groupID).First(&group).Error
	if err != nil {
		return defaultCooldown
	}

	if group.Cooldown == nil {
		return defaultCooldown
	}

	return *group.Cooldown
}

func (b *Bot) canInsert(groupID, voterID int64) (bool, int) {
	var lastVote db.ClownVote

	err := b.db.Where("group_id = ? AND voter_id = ?", groupID, voterID).
		Order("voted_at DESC").
		First(&lastVote).Error
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			log.Printf("Failed to load last vote: %v", err)
		}

		return true, 0
	}

	cooldown := b.getGroupCooldown(groupID)

	lastTime, parseErr := time.Parse(time.RFC3339, lastVote.VotedAt)
	if parseErr != nil {
		return true, 0
	}

	diff := time.Now().UnixMilli() - lastTime.UnixMilli()
	if diff > cooldown {
		return true, 0
	}

	waitMin := int(math.Ceil(float64(cooldown-diff) / msPerSecond / secondsPerMinute))

	return false, waitMin
}
