// Package migrations embeds SQL migration files for use at runtime.
package migrations

import "embed"

// FS embeds all SQL migration files.
//
//go:embed *.sql
var FS embed.FS
