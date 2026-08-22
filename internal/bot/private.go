package bot

import (
	"github.com/haashemi/tgo"
	"github.com/haashemi/tgo/routers/message"
)

func (b *Bot) start(ctx *message.Context) {
	b.reply(ctx, "cmd_start", nil)
}

func (b *Bot) source(ctx *message.Context) {
	_, err := ctx.Reply(&tgo.SendMessage{
		Text:               b.t("cmd_source", nil),
		LinkPreviewOptions: &tgo.LinkPreviewOptions{IsDisabled: true},
	})
	if err != nil {
		b.logReplyErr(err)
	}
}

func (b *Bot) privacy(ctx *message.Context) {
	b.reply(ctx, "cmd_privacy", nil)
}
