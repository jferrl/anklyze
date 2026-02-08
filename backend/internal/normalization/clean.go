package normalization

import (
	"regexp"
	"strings"
)

var (
	// Compile regexes at package level for performance
	multipleSpacesRegex = regexp.MustCompile(`\s+`)
	spaceInNumberRegex  = regexp.MustCompile(`(\d+)\.\s+(\d+)`)
	europeanCommaRegex  = regexp.MustCompile(`^(\d+),(\d+)$`)
	thousandsSepRegex   = regexp.MustCompile(`(\d{1,3})\.(\d{3})`)
)

// trimWhitespace removes leading/trailing whitespace and collapses internal spaces.
func trimWhitespace(s string) string {
	s = strings.TrimSpace(s)
	s = multipleSpacesRegex.ReplaceAllString(s, " ")
	return s
}

// clearExcelErrors removes Excel error values.
func clearExcelErrors(s string) string {
	lower := strings.ToLower(s)

	// Check for Excel error codes
	if lower == "#div/0!" || lower == "#n/a" || lower == "#ref!" ||
		lower == "#value!" || lower == "#null!" {
		return ""
	}

	// Check for Excel formulas
	if strings.HasPrefix(lower, "=suma(") {
		return ""
	}

	return s
}

// normalizeNulls handles various representations of null/missing values.
// Returns (cleanedValue, nullType).
func normalizeNulls(s string) (string, string) {
	if s == "" {
		return "", "not_recorded"
	}

	lower := strings.ToLower(strings.TrimSpace(s))

	// Not applicable
	if lower == "n/a" || lower == "na" || lower == "-" {
		return "", "not_applicable"
	}

	// Pending
	if lower == "pendiente" {
		return "", "pending"
	}

	// Uncertain
	if lower == "?" || strings.HasPrefix(lower, "duda") {
		return "", "uncertain"
	}

	return s, ""
}

// cleanNumeric cleans numeric values by handling European formats and spaces.
func cleanNumeric(s string) string {
	if s == "" {
		return ""
	}

	// Remove spaces within numbers: "29. 24" → "29.24"
	s = spaceInNumberRegex.ReplaceAllString(s, "$1.$2")

	// Check if this looks like a European decimal number with comma
	if europeanCommaRegex.MatchString(s) {
		// European comma to dot: "29,24" → "29.24"
		s = strings.Replace(s, ",", ".", 1)
	} else {
		// Remove thousands separators: "1.234,56" → "1234.56"
		// First convert European format if present
		if strings.Contains(s, ",") && strings.Contains(s, ".") {
			// Likely format: 1.234,56 or 1,234.56
			commaPos := strings.LastIndex(s, ",")
			dotPos := strings.LastIndex(s, ".")

			if commaPos > dotPos {
				// European: 1.234,56 → remove dots, change comma to dot
				s = strings.ReplaceAll(s, ".", "")
				s = strings.Replace(s, ",", ".", 1)
			} else {
				// US format: 1,234.56 → remove commas
				s = strings.ReplaceAll(s, ",", "")
			}
		}
	}

	return s
}

// cleanQuotes removes or normalizes quotation marks.
func cleanQuotes(s string) string {
	if s == "" {
		return ""
	}

	// Replace smart quotes with straight quotes
	s = strings.ReplaceAll(s, "\u201C", `"`) // Left double quote
	s = strings.ReplaceAll(s, "\u201D", `"`) // Right double quote
	s = strings.ReplaceAll(s, "\u2018", "'") // Left single quote
	s = strings.ReplaceAll(s, "\u2019", "'") // Right single quote

	// Remove redundant wrapping quotes
	if len(s) >= 2 {
		if (s[0] == '"' && s[len(s)-1] == '"') || (s[0] == '\'' && s[len(s)-1] == '\'') {
			s = s[1 : len(s)-1]
		}
	}

	return s
}

// isNumericField returns true if the field should be cleaned as numeric.
func isNumericField(fieldName string) bool {
	numericFields := map[string]bool{
		"age":       true,
		"height_cm": true,
		"weight_kg": true,
		"bmi":       true,
		"vitamin_d": true,
	}
	return numericFields[fieldName]
}

// cleanPhase orchestrates the cleaning phase of CSV normalization.
func cleanPhase(records []map[string]string) *cleanResult {
	var log []LogEntry
	cellsCleaned := 0
	cleanedRecords := make([]map[string]string, 0, len(records))

	for rowIdx, record := range records {
		cleanedRecord := make(map[string]string)
		rowNumber := rowIdx + 2 // +2 because row 1 is header, and we're 0-indexed

		for fieldName, value := range record {
			original := value
			cellLogged := false

			// Step 1: Trim whitespace
			value = trimWhitespace(value)

			// Step 2: Clear Excel errors
			cleared := clearExcelErrors(value)
			if cleared != value {
				log = append(log, LogEntry{
					Row:             rowNumber,
					Column:          fieldName,
					OriginalValue:   original,
					NormalizedValue: "",
					Action:          "clear_excel_error",
					Severity:        "warning",
				})
				cellLogged = true
				value = cleared
			}

			// Step 3: Normalize nulls (only count if value was non-empty before this step)
			preNullValue := value
			normalized, nullType := normalizeNulls(value)
			if nullType != "" && preNullValue != "" {
				log = append(log, LogEntry{
					Row:             rowNumber,
					Column:          fieldName,
					OriginalValue:   original,
					NormalizedValue: "",
					Action:          "normalize_null_" + nullType,
					Severity:        "info",
				})
				cellLogged = true
			}
			value = normalized

			// Step 4: Clean numeric fields
			if value != "" && isNumericField(fieldName) {
				cleaned := cleanNumeric(value)
				if cleaned != value {
					log = append(log, LogEntry{
						Row:             rowNumber,
						Column:          fieldName,
						OriginalValue:   value,
						NormalizedValue: cleaned,
						Action:          "clean_numeric",
						Severity:        "info",
					})
					cellLogged = true
					value = cleaned
				}
			}

			// Step 5: Clean quotes
			if value != "" {
				cleaned := cleanQuotes(value)
				if cleaned != value {
					log = append(log, LogEntry{
						Row:             rowNumber,
						Column:          fieldName,
						OriginalValue:   value,
						NormalizedValue: cleaned,
						Action:          "clean_quotes",
						Severity:        "info",
					})
					cellLogged = true
					value = cleaned
				}
			}

			// Log whitespace-only changes that weren't captured by other steps
			if value != original && !cellLogged {
				log = append(log, LogEntry{
					Row:             rowNumber,
					Column:          fieldName,
					OriginalValue:   original,
					NormalizedValue: value,
					Action:          "clean_whitespace",
					Severity:        "info",
				})
				cellLogged = true
			}

			// Count each changed cell exactly once
			if value != original && cellLogged {
				cellsCleaned++
			}

			cleanedRecord[fieldName] = value
		}

		cleanedRecords = append(cleanedRecords, cleanedRecord)
	}

	return &cleanResult{
		records:      cleanedRecords,
		log:          log,
		cellsCleaned: cellsCleaned,
	}
}
