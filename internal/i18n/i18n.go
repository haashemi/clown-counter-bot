package i18n

import (
	"fmt"
	"strings"
)

// I18n is a minimal message formatter used for translating the bot messages.
type I18n struct {
	messages map[string]string
}

// New returns an I18n instance initialized with the default (fa) locale.
func New() *I18n {
	return &I18n{messages: faMessages()}
}

// T translates the message with the given key and replaces the {placeholder}
// variables with the given values.
func (i *I18n) T(key string, vars map[string]any) string {
	msg, ok := i.messages[key]
	if !ok {
		return key
	}

	for name, value := range vars {
		msg = strings.ReplaceAll(msg, "{"+name+"}", fmt.Sprint(value))
	}

	return msg
}
