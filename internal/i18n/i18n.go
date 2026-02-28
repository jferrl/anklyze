package i18n

import (
	"strings"
)

// Language represents a supported language.
type Language string

// English and related constants define the supported language codes.
const (
	English Language = "en"
	Spanish Language = "es"
)

// DefaultLanguage is the fallback language
const DefaultLanguage = English

// ParseLanguage parses a language string into a Language
func ParseLanguage(lang string) Language {
	switch strings.ToLower(strings.TrimSpace(lang)) {
	case "es", "es-es", "es-mx", "es-ar":
		return Spanish
	default:
		return English
	}
}

// ParseAcceptLanguage parses the Accept-Language header
func ParseAcceptLanguage(header string) Language {
	if header == "" {
		return DefaultLanguage
	}

	// Simple parsing: take the first language
	parts := strings.Split(header, ",")
	if len(parts) > 0 {
		lang := strings.TrimSpace(strings.Split(parts[0], ";")[0])
		return ParseLanguage(lang)
	}

	return DefaultLanguage
}
