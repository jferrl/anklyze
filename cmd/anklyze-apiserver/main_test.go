package main

import (
	"errors"
	"os"
	"os/exec"
	"strings"
	"testing"
)

// runMain re-executes the test binary as the server with extra env and returns
// its exit code and combined output.
func runMain(t *testing.T, test string, env ...string) (int, string) {
	t.Helper()
	cmd := exec.Command(os.Args[0], "-test.run=^"+test+"$")
	cmd.Env = append(os.Environ(), "RUN_MAIN=1", "DATABASE_URL=", "APP_ENV=development", "PORT=8080",
		"S3_ENDPOINT=", "S3_ACCESS_KEY=", "S3_SECRET_KEY=")
	cmd.Env = append(cmd.Env, env...)
	out, err := cmd.CombinedOutput()

	var exitErr *exec.ExitError
	if !errors.As(err, &exitErr) {
		t.Fatalf("server exited without error status: err = %v", err)
	}
	return exitErr.ExitCode(), string(out)
}

// TestMainRequiresDatabase runs the server with no DATABASE_URL and expects a
// non-zero exit instead of a degraded start.
func TestMainRequiresDatabase(t *testing.T) {
	if os.Getenv("RUN_MAIN") == "1" {
		main()
		return
	}

	if code, out := runMain(t, "TestMainRequiresDatabase"); code != 1 || !strings.Contains(out, "DATABASE_URL") {
		t.Fatalf("server without DATABASE_URL: exit code = %d, want 1 naming DATABASE_URL: %s", code, out)
	}
}

// TestMainProductionRequiresStorage expects production without S3 to be
// refused for that reason, before any database work.
func TestMainProductionRequiresStorage(t *testing.T) {
	if os.Getenv("RUN_MAIN") == "1" {
		main()
		return
	}

	code, out := runMain(t, "TestMainProductionRequiresStorage",
		"APP_ENV=production", "SUPABASE_URL=https://abc.supabase.co")
	if code != 1 || !strings.Contains(out, "S3_ENDPOINT") {
		t.Fatalf("production without storage: exit code = %d, output = %q, want 1 naming S3_ENDPOINT", code, out)
	}
}

// TestMainRefusesWithoutAppEnv guards the dev auth bypass: an unset APP_ENV
// must enforce production checks rather than run every route as admin.
func TestMainRefusesWithoutAppEnv(t *testing.T) {
	if os.Getenv("RUN_MAIN") == "1" {
		main()
		return
	}

	code, out := runMain(t, "TestMainRefusesWithoutAppEnv", "APP_ENV=", "SUPABASE_URL=")
	if code != 1 || !strings.Contains(out, "SUPABASE_URL is required") {
		t.Fatalf("server without APP_ENV: exit code = %d, want 1 naming SUPABASE_URL: %s", code, out)
	}
}
