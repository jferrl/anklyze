package main

import (
	"errors"
	"os"
	"os/exec"
	"testing"
)

// TestMainRequiresDatabase re-executes the test binary as the server with no
// DATABASE_URL and expects a non-zero exit instead of a degraded start.
func TestMainRequiresDatabase(t *testing.T) {
	if os.Getenv("RUN_MAIN") == "1" {
		main()
		return
	}

	cmd := exec.Command(os.Args[0], "-test.run=^TestMainRequiresDatabase$")
	cmd.Env = append(os.Environ(), "RUN_MAIN=1", "DATABASE_URL=", "APP_ENV=", "PORT=0")
	err := cmd.Run()

	var exitErr *exec.ExitError
	if !errors.As(err, &exitErr) || exitErr.ExitCode() != 1 {
		t.Fatalf("server without DATABASE_URL: err = %v, want exit status 1", err)
	}
}
