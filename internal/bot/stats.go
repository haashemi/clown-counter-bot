package bot

import (
	"log"
	"strings"

	"github.com/haashemi/tgo/routers/message"
)

type statsRow struct {
	Name  string
	Count int64
}

func (b *Bot) stats(ctx *message.Context) {
	var rows []statsRow

	err := b.db.Table("clown_votes").
		Select("users.name AS name, COUNT(clown_votes.id) AS count").
		Joins("LEFT JOIN users ON users.id = clown_votes.clown_id").
		Where("clown_votes.group_id = ?", ctx.Chat.Id).
		Group("users.id").
		Order("COUNT(clown_votes.id) DESC").
		Scan(&rows).Error
	if err != nil {
		log.Printf("Failed to load stats: %v", err)

		return
	}

	if len(rows) == 0 {
		b.reply(ctx, "cmd_stats_no_clown", nil)

		return
	}

	clowns := make([]string, 0, len(rows))
	for _, row := range rows {
		clowns = append(clowns, b.t("cmd_stats_group_clown", map[string]any{
			"name":  row.Name,
			"votes": row.Count,
		}))
	}

	b.reply(ctx, "cmd_stats_group", map[string]any{
		"clowns": strings.Join(clowns, "\n"),
	})
}
