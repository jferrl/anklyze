package database

import (
	"errors"
	"testing"
	"time"

	"gorm.io/gorm"
)

func TestRetry(t *testing.T) {
	t.Parallel()

	errDown := errors.New("down")

	t.Run("succeeds after transient failures with capped backoff", func(t *testing.T) {
		t.Parallel()
		calls := 0
		var sleeps []time.Duration
		db, err := retry(5, time.Second, 3*time.Second, func(d time.Duration) { sleeps = append(sleeps, d) }, func() (*gorm.DB, error) {
			calls++
			if calls < 4 {
				return nil, errDown
			}
			return &gorm.DB{}, nil
		})
		if err != nil || db == nil {
			t.Fatalf("retry() = %v, %v; want db, nil", db, err)
		}
		want := []time.Duration{time.Second, 2 * time.Second, 3 * time.Second}
		if len(sleeps) != len(want) {
			t.Fatalf("sleeps = %v, want %v", sleeps, want)
		}
		for i := range want {
			if sleeps[i] != want[i] {
				t.Errorf("sleeps[%d] = %v, want %v", i, sleeps[i], want[i])
			}
		}
	})

	t.Run("gives up after attempts and wraps the last error", func(t *testing.T) {
		t.Parallel()
		calls := 0
		_, err := retry(3, time.Millisecond, time.Millisecond, func(time.Duration) {}, func() (*gorm.DB, error) {
			calls++
			return nil, errDown
		})
		if !errors.Is(err, errDown) || calls != 3 {
			t.Fatalf("err = %v, calls = %d; want wrapped errDown after 3 calls", err, calls)
		}
	})
}

func TestWithConnectTimeout(t *testing.T) {
	t.Parallel()

	tests := []struct{ in, want string }{
		{"postgres://u:p@h:5432/db?sslmode=disable", "postgres://u:p@h:5432/db?connect_timeout=5&sslmode=disable"},
		{"postgres://h/db?connect_timeout=1", "postgres://h/db?connect_timeout=1"},
		{"host=h dbname=db", "host=h dbname=db"},
	}
	for _, tt := range tests {
		if got := withConnectTimeout(tt.in); got != tt.want {
			t.Errorf("withConnectTimeout(%q) = %q, want %q", tt.in, got, tt.want)
		}
	}
}
