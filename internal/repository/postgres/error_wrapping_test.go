package postgres

import (
	"errors"
	"fmt"
	"testing"

	"gorm.io/gorm"
)

// TestErrorWrapping verifies that repository-level fmt.Errorf wrapping
// preserves the ability to unwrap original errors via errors.Is().
func TestErrorWrapping(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		wrapped    error
		target     error
		wantMatch  bool
		wantSubstr string
	}{
		{
			name:       "wrapped gorm.ErrRecordNotFound is still detectable",
			wrapped:    fmt.Errorf("get by id: %w", gorm.ErrRecordNotFound),
			target:     gorm.ErrRecordNotFound,
			wantMatch:  true,
			wantSubstr: "get by id",
		},
		{
			name:       "double-wrapped error is still detectable",
			wrapped:    fmt.Errorf("service: %w", fmt.Errorf("get by id: %w", gorm.ErrRecordNotFound)),
			target:     gorm.ErrRecordNotFound,
			wantMatch:  true,
			wantSubstr: "service: get by id",
		},
		{
			name:       "wrapped generic error preserves message",
			wrapped:    fmt.Errorf("create: %w", errors.New("connection refused")),
			target:     gorm.ErrRecordNotFound,
			wantMatch:  false,
			wantSubstr: "create: connection refused",
		},
		{
			name:       "nil target check with wrapped error",
			wrapped:    fmt.Errorf("update: %w", gorm.ErrDuplicatedKey),
			target:     gorm.ErrDuplicatedKey,
			wantMatch:  true,
			wantSubstr: "update",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			if got := errors.Is(tt.wrapped, tt.target); got != tt.wantMatch {
				t.Errorf("errors.Is() = %v, want %v", got, tt.wantMatch)
			}

			if msg := tt.wrapped.Error(); !containsStr(msg, tt.wantSubstr) {
				t.Errorf("error message %q does not contain %q", msg, tt.wantSubstr)
			}
		})
	}
}

func containsStr(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && findStr(s, substr))
}

func findStr(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
