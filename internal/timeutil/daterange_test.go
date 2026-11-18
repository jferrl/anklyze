package timeutil

import (
	"strings"
	"testing"
	"time"
)

func TestParseDateRange(t *testing.T) {
	t.Parallel()

	// Use a fixed reference time for consistent tests
	now := time.Now()

	tests := []struct {
		name    string
		fromStr string
		toStr   string
		check   func(t *testing.T, dr DateRange)
	}{
		{
			name:    "empty strings use defaults",
			fromStr: "",
			toStr:   "",
			check: func(t *testing.T, dr DateRange) {
				// From should be approximately 30 days ago
				fromDiff := now.Sub(dr.From)
				if fromDiff < 29*24*time.Hour || fromDiff > 31*24*time.Hour {
					t.Errorf("From date should be ~30 days ago, got diff: %v", fromDiff)
				}
				// To should be approximately now (allow small drift in either direction)
				toDiff := now.Sub(dr.To)
				if toDiff < -time.Minute || toDiff > time.Minute {
					t.Errorf("To date should be approximately now, got diff: %v", toDiff)
				}
			},
		},
		{
			name:    "valid from date",
			fromStr: "2024-01-15",
			toStr:   "2024-02-15",
			check: func(t *testing.T, dr DateRange) {
				expected := time.Date(2024, 1, 15, 0, 0, 0, 0, time.UTC)
				if !dr.From.Equal(expected) {
					t.Errorf("From = %v, want %v", dr.From, expected)
				}
			},
		},
		{
			name:    "valid to date sets end of day",
			fromStr: "",
			toStr:   "2024-06-30",
			check: func(t *testing.T, dr DateRange) {
				if dr.To.Hour() != 23 || dr.To.Minute() != 59 || dr.To.Second() != 59 {
					t.Errorf("To should be end of day, got %v", dr.To)
				}
				if dr.To.Year() != 2024 || dr.To.Month() != 6 || dr.To.Day() != 30 {
					t.Errorf("To date mismatch: got %v", dr.To)
				}
			},
		},
		{
			name:    "both dates valid",
			fromStr: "2024-03-01",
			toStr:   "2024-03-31",
			check: func(t *testing.T, dr DateRange) {
				expectedFrom := time.Date(2024, 3, 1, 0, 0, 0, 0, time.UTC)
				if !dr.From.Equal(expectedFrom) {
					t.Errorf("From = %v, want %v", dr.From, expectedFrom)
				}
				if dr.To.Year() != 2024 || dr.To.Month() != 3 || dr.To.Day() != 31 {
					t.Errorf("To date mismatch: got %v", dr.To)
				}
				if dr.To.Hour() != 23 {
					t.Errorf("To should be end of day")
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			dr, err := ParseDateRange(tt.fromStr, tt.toStr)
			if err != nil {
				t.Fatalf("ParseDateRange(%q, %q) error = %v", tt.fromStr, tt.toStr, err)
			}
			tt.check(t, dr)
		})
	}
}

func TestParseDateRange_Errors(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		fromStr string
		toStr   string
		wantErr string
	}{
		{"malformed from", "not-a-date", "", "invalid 'from' date"},
		{"malformed to", "", "invalid", "invalid 'to' date"},
		{"wrong format", "15/01/2024", "30/06/2024", "invalid 'to' date"},
		{"impossible calendar date", "2024-02-30", "", "invalid 'from' date"},
		{"from after to", "2024-12-31", "2024-01-01", "must not be after"},
		{"from in the future", "2999-01-01", "", "must not be after"},
		{"range just over the maximum", "2023-01-01", "2024-01-02", "must not exceed"},
		{"huge range", "0001-01-01", "", "must not exceed"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			_, err := ParseDateRange(tt.fromStr, tt.toStr)
			if err == nil || !strings.Contains(err.Error(), tt.wantErr) {
				t.Errorf("ParseDateRange(%q, %q) error = %v, want containing %q", tt.fromStr, tt.toStr, err, tt.wantErr)
			}
		})
	}
}

func TestParseDateRange_Limits(t *testing.T) {
	t.Parallel()

	// 365 days plus the end-of-day offset is within MaxRangeDays.
	if _, err := ParseDateRange("2023-01-01", "2023-12-31"); err != nil {
		t.Errorf("range within MaxRangeDays rejected: %v", err)
	}

	// With only "to" given, from defaults relative to it, so a past "to" is valid.
	dr, err := ParseDateRange("", "2020-06-30")
	if err != nil {
		t.Fatalf("past to-only range rejected: %v", err)
	}
	if want := time.Date(2020, 6, 30, 23, 59, 59, 0, time.UTC).AddDate(0, 0, -DefaultRangeDays); !dr.From.Equal(want) {
		t.Errorf("From = %v, want %v", dr.From, want)
	}
}

func TestEndOfDay(t *testing.T) {
	t.Parallel()

	input := time.Date(2024, 6, 15, 10, 30, 0, 0, time.UTC)
	result := endOfDay(input)

	if result.Year() != 2024 || result.Month() != 6 || result.Day() != 15 {
		t.Errorf("Date changed: got %v", result)
	}
	if result.Hour() != 23 || result.Minute() != 59 || result.Second() != 59 {
		t.Errorf("Time should be 23:59:59, got %02d:%02d:%02d", result.Hour(), result.Minute(), result.Second())
	}
}

func TestConstants(t *testing.T) {
	t.Parallel()

	if DateFormat != "2006-01-02" {
		t.Errorf("DateFormat = %q, want %q", DateFormat, "2006-01-02")
	}
	if DefaultRangeDays != 30 {
		t.Errorf("DefaultRangeDays = %d, want 30", DefaultRangeDays)
	}
}
