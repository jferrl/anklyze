// Package timeutil provides time-related utility functions.
package timeutil

import "time"

// DateFormat is the standard date format used for parsing date strings.
const DateFormat = "2006-01-02"

// DefaultRangeDays is the default number of days for date range queries.
const DefaultRangeDays = 30

// DateRange represents a time range with start and end times.
type DateRange struct {
	From time.Time
	To   time.Time
}

// ParseDateRange parses from/to date strings and returns a DateRange.
// Empty strings use defaults: from = 30 days ago, to = now (end of day).
func ParseDateRange(fromStr, toStr string) DateRange {
	now := time.Now()
	dr := DateRange{
		From: now.AddDate(0, 0, -DefaultRangeDays),
		To:   now,
	}

	if fromStr != "" {
		if parsed, err := time.Parse(DateFormat, fromStr); err == nil {
			dr.From = parsed
		}
	}

	if toStr != "" {
		if parsed, err := time.Parse(DateFormat, toStr); err == nil {
			// Set to end of day
			dr.To = endOfDay(parsed)
		}
	}

	return dr
}

// endOfDay returns the time at 23:59:59 of the given day.
func endOfDay(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 23, 59, 59, 0, t.Location())
}
