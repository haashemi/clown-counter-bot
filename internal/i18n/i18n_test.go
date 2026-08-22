package i18n_test

import (
	"testing"

	"github.com/haashemi/clown-counter-bot/internal/i18n"
)

func TestT(t *testing.T) {
	t.Parallel()

	i := i18n.New()

	got := i.T("cmd_clown", map[string]any{"clown": "Ali", "voter": "Reza"})
	want := "\u200F🤡 Ali توسط Reza دلقک شد!"

	if got != want {
		t.Errorf("T(cmd_clown) = %q, want %q", got, want)
	}
}

func TestTMissingKey(t *testing.T) {
	t.Parallel()

	i := i18n.New()

	if got := i.T("missing_key", nil); got != "missing_key" {
		t.Errorf("T(missing_key) = %q, want %q", got, "missing_key")
	}
}
