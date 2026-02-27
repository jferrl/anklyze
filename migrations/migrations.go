// Package migrations embeds SQL migration files for use at runtime.
package migrations

import "embed"

//go:embed *.sql
var FS embed.FS
