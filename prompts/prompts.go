// Package prompts embeds LLM prompt templates for use at runtime.
package prompts

import "embed"

// FS embeds all LLM prompt template files.
//
//go:embed classification/*.tmpl chat/*.tmpl
var FS embed.FS
