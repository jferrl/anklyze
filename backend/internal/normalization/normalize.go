package normalization

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// Date format patterns (compiled at package level for performance)
var (
	isoDatePattern    = regexp.MustCompile(`^(\d{4})-(\d{1,2})-(\d{1,2})$`)
	monthYearPattern  = regexp.MustCompile(`(?i)^(\d{1,2})\s+(\w+)\s+(\d{2,4})$`)
	slashDashPattern  = regexp.MustCompile(`^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$`)
)

// parseSpanishDate parses multiple Spanish date formats with progressive fallback.
// Supports formats:
// 1. ISO 8601: "2025-06-01"
// 2. "DD mes YYYY": "30 mayo 2025", "1 junio 2025"
// 3. "DD mes YY": "01 junio 25", "1 octubre 25"
// 4. "DD/MM/YYYY": "01/06/2025"
// 5. "DD/MM/YY": "01/06/25"
// 6. "DD-MM-YYYY": "01-06-2025"
func parseSpanishDate(s string) (*time.Time, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil, fmt.Errorf("empty date string")
	}

	// Try ISO 8601 format first
	if matches := isoDatePattern.FindStringSubmatch(s); matches != nil {
		year, _ := strconv.Atoi(matches[1])
		month, _ := strconv.Atoi(matches[2])
		day, _ := strconv.Atoi(matches[3])
		t := time.Date(year, time.Month(month), day, 0, 0, 0, 0, time.UTC)
		return &t, nil
	}

	// Try "DD mes YYYY" or "DD mes YY" format
	if matches := monthYearPattern.FindStringSubmatch(s); matches != nil {
		day, _ := strconv.Atoi(matches[1])
		monthName := strings.ToLower(strings.TrimSpace(matches[2]))
		yearStr := matches[3]

		// Look up Spanish month
		month, ok := spanishMonths[monthName]
		if !ok {
			return nil, fmt.Errorf("invalid month name: %s", matches[2])
		}

		// Parse year
		year, _ := strconv.Atoi(yearStr)
		if year < 100 {
			// 2-digit year: < 70 = 2000+, >= 70 = 1900+
			if year < 70 {
				year += 2000
			} else {
				year += 1900
			}
		}

		t := time.Date(year, time.Month(month), day, 0, 0, 0, 0, time.UTC)
		return &t, nil
	}

	// Try DD/MM/YYYY or DD-MM-YYYY format
	if matches := slashDashPattern.FindStringSubmatch(s); matches != nil {
		day, _ := strconv.Atoi(matches[1])
		month, _ := strconv.Atoi(matches[2])
		yearStr := matches[3]

		year, _ := strconv.Atoi(yearStr)
		if year < 100 {
			// 2-digit year: < 70 = 2000+, >= 70 = 1900+
			if year < 70 {
				year += 2000
			} else {
				year += 1900
			}
		}

		t := time.Date(year, time.Month(month), day, 0, 0, 0, 0, time.UTC)
		return &t, nil
	}

	return nil, fmt.Errorf("unrecognized date format: %s", s)
}

// normalizeSex normalizes sex/gender values.
func normalizeSex(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	if normalized, ok := sexMap[s]; ok {
		return normalized
	}
	return ""
}

// normalizeLaterality normalizes laterality values.
func normalizeLaterality(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	if normalized, ok := lateralityMap[s]; ok {
		return normalized
	}
	return ""
}

// normalizeMechanism normalizes injury mechanism values.
func normalizeMechanism(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	if normalized, ok := mechanismMap[s]; ok {
		return normalized
	}
	return ""
}

// normalizeEnergy normalizes trauma energy values.
func normalizeEnergy(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	if normalized, ok := energyMap[s]; ok {
		return normalized
	}
	return ""
}

// normalizeBoolean normalizes boolean values.
// Returns (value, ok) where ok indicates if the value was recognized.
func normalizeBoolean(s string) (bool, bool) {
	s = strings.ToLower(strings.TrimSpace(s))
	if normalized, ok := boolMap[s]; ok {
		return normalized == "true", true
	}
	return false, false
}

// normalizeEmergencyTreatment normalizes emergency treatment values.
func normalizeEmergencyTreatment(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	if normalized, ok := emergencyTreatmentMap[s]; ok {
		return normalized
	}
	return ""
}

// normalizeOpenClosed normalizes open/closed fracture values.
func normalizeOpenClosed(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	if normalized, ok := openClosedMap[s]; ok {
		return normalized
	}
	return ""
}

// normalizePhase performs Phase 3: deterministic normalization of dates, enums, and booleans.
func normalizePhase(records []map[string]string) *normalizeResult {
	result := &normalizeResult{
		records:         make([]map[string]string, len(records)),
		log:             []LogEntry{},
		datesNormalized: 0,
		enumsMapped:     0,
	}

	// Copy records for transformation
	for i, rec := range records {
		result.records[i] = make(map[string]string)
		for k, v := range rec {
			result.records[i][k] = v
		}
	}

	// Date fields to normalize
	dateFields := []string{"fracture_date", "er_date", "surgery_date"}

	// Enum fields to normalize
	enumFields := map[string]func(string) string{
		"sex":                 normalizeSex,
		"laterality":          normalizeLaterality,
		"injury_mechanism":    normalizeMechanism,
		"trauma_energy":       normalizeEnergy,
		"emergency_treatment": normalizeEmergencyTreatment,
		"open_closed":         normalizeOpenClosed,
	}

	// Boolean fields to normalize
	boolFields := []string{"syndesmosis", "preop_ct", "anticoagulation", "secondary_displacement"}

	for i, rec := range result.records {
		rowNum := i + 1

		// Normalize date fields
		for _, field := range dateFields {
			if original, exists := rec[field]; exists && original != "" {
				if parsed, err := parseSpanishDate(original); err == nil {
					normalized := parsed.Format("2006-01-02")
					result.records[i][field] = normalized
					result.datesNormalized++
					result.log = append(result.log, LogEntry{
						Row:             rowNum,
						Column:          field,
						OriginalValue:   original,
						NormalizedValue: normalized,
						Action:          "date_normalized",
						Severity:        "info",
					})
				} else {
					// Date parsing failed - log warning but keep original
					result.log = append(result.log, LogEntry{
						Row:             rowNum,
						Column:          field,
						OriginalValue:   original,
						NormalizedValue: original,
						Action:          "date_parse_failed",
						Severity:        "warning",
					})
				}
			}
		}

		// Normalize enum fields
		for field, normalizeFunc := range enumFields {
			if original, exists := rec[field]; exists && original != "" {
				normalized := normalizeFunc(original)
				if normalized != "" {
					result.records[i][field] = normalized
					result.enumsMapped++
					result.log = append(result.log, LogEntry{
						Row:             rowNum,
						Column:          field,
						OriginalValue:   original,
						NormalizedValue: normalized,
						Action:          "enum_mapped",
						Severity:        "info",
					})
				} else {
					// No mapping found - log warning but keep original
					result.log = append(result.log, LogEntry{
						Row:             rowNum,
						Column:          field,
						OriginalValue:   original,
						NormalizedValue: original,
						Action:          "enum_unmapped",
						Severity:        "warning",
					})
				}
			}
		}

		// Normalize boolean fields
		for _, field := range boolFields {
			if original, exists := rec[field]; exists && original != "" {
				if value, ok := normalizeBoolean(original); ok {
					normalized := "false"
					if value {
						normalized = "true"
					}
					result.records[i][field] = normalized
					result.enumsMapped++
					result.log = append(result.log, LogEntry{
						Row:             rowNum,
						Column:          field,
						OriginalValue:   original,
						NormalizedValue: normalized,
						Action:          "boolean_normalized",
						Severity:        "info",
					})
				} else {
					// Boolean not recognized - log warning but keep original
					result.log = append(result.log, LogEntry{
						Row:             rowNum,
						Column:          field,
						OriginalValue:   original,
						NormalizedValue: original,
						Action:          "boolean_unmapped",
						Severity:        "warning",
					})
				}
			}
		}
	}

	return result
}
