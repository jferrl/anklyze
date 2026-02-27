// Package prompts embeds LLM prompt templates for use at runtime.
package prompts

import "embed"

//go:embed classification/*.tmpl chat/*.tmpl
var FS embed.FS
