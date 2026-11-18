// Package timeutil provides time-related utility functions.
package timeutil

import (
	"errors"
	"fmt"
	"time"
)

// DateFormat is the standard date format used for parsing date strings.
const DateFormat = "2006-01-02"

// DefaultRangeDays is the default number of days for date range queries.
const DefaultRangeDays = 30

// DateRange represents a time range with start and end times.
type DateRange struct {
	From time.Time
	To   time.Time
}

// MaxRangeDays is the longest date range a query may span.
const MaxRangeDays = 366

// ParseDateRange parses from/to date strings (YYYY-MM-DD) into a DateRange.
// A missing "to" defaults to now and a missing "from" to DefaultRangeDays before "to".
// It rejects malformed dates, from after to, and ranges longer than MaxRangeDays.
func ParseDateRange(fromStr, toStr string) (DateRange, error) {
	to := time.Now()
	if toStr != "" {
		t, err := time.Parse(DateFormat, toStr)
		if err != nil {
			return DateRange{}, fmt.Errorf("invalid 'to' date %q: expected YYYY-MM-DD", toStr)
		}
		to = endOfDay(t)
	}

	from := to.AddDate(0, 0, -DefaultRangeDays)
	if fromStr != "" {
		t, err := time.Parse(DateFormat, fromStr)
		if err != nil {
			return DateRange{}, fmt.Errorf("invalid 'from' date %q: expected YYYY-MM-DD", fromStr)
		}
		from = t
	}

	if from.After(to) {
		return DateRange{}, errors.New("'from' must not be after 'to'")
	}
	if to.Sub(from) > MaxRangeDays*24*time.Hour {
		return DateRange{}, fmt.Errorf("date range must not exceed %d days", MaxRangeDays)
	}

	return DateRange{From: from, To: to}, nil
}

// endOfDay returns the time at 23:59:59 of the given day.
func endOfDay(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 23, 59, 59, 0, t.Location())
}
