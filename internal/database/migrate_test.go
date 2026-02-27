package database

import (
	"embed"
	"testing"

	"github.com/jferrl/anklyze/migrations"
)

func TestRunMigrations_EmptyFS(t *testing.T) {
	// Empty FS (no embedded files) has no SQL migrations to apply.
	// iofs.New succeeds with an empty FS, but the migrator fails to connect to the DB.
	// This test verifies that RunMigrations returns an error for any unusable setup.
	var emptyFS embed.FS
	err := RunMigrations(emptyFS, "postgres://localhost/test?connect_timeout=1")
	if err == nil {
		t.Error("expected error for unreachable database, got nil")
	}
}

func TestRunMigrations_BadDatabaseURL(t *testing.T) {
	// Valid FS from the actual migrations package, but bad DB URL — should fail at migrator creation.
	err := RunMigrations(migrations.FS, "postgres://invalid:5432/nonexistent?sslmode=disable&connect_timeout=1")
	if err == nil {
		t.Error("expected error for invalid database URL, got nil")
	}
}
