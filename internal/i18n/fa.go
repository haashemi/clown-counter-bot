package i18n

import (
	_ "embed"

	"github.com/goccy/go-yaml"
)

//go:embed translations/fa.yaml
var faTranslations []byte

// faMessages returns the Persian translations of the bot messages.
func faMessages() map[string]string {
	messages := map[string]string{}

	err := yaml.Unmarshal(faTranslations, &messages)
	if err != nil {
		panic(err)
	}

	return messages
}
