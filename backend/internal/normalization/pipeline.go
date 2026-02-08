package normalization

import (
	"context"
	"encoding/json"
	"errors"
	"strconv"
	"strings"
	"time"
)

// Run executes all pipeline phases and returns the final result.
// Pass nil LLMClient in config for regex-only mode.
func Run(csvData []byte, config PipelineConfig) (*PipelineResult, error) {
	// Validate input
	if len(csvData) == 0 {
		return nil, errors.New("empty CSV data provided")
	}

	// Phase 1: Parse CSV
	pr, err := parsePhase(csvData)
	if err != nil {
		return nil, err
	}

	// Check if we have any data after parsing
	if len(pr.records) == 0 {
		return nil, errors.New("no data rows found in CSV")
	}

	// Phase 2: Clean data
	cr := cleanPhase(pr.records)

	// Phase 3: Normalize enums and dates
	nr := normalizePhase(cr.records)

	// Phase 3b: AI-based normalization (surgery extraction)
	ar := aiNormalizePhase(context.Background(), nr.records, config.LLMClient, config.Language)

	// Convert map records to structured NormalizedRecord
	normalizedRecords := recordsFromMaps(ar.records)

	// Phase 5: Enrich with derived fields (BEFORE validation so BMI cross-check works)
	enriched := enrichPhase(normalizedRecords)

	// Phase 4: Validate (done after enrichment)
	vr := validatePhase(enriched)

	// Assemble final result
	result := &PipelineResult{
		Records:  enriched,
		Log:      aggregateLogs(pr.log, cr.log, nr.log, ar.log),
		Stats:    aggregateStats(pr, cr, nr, ar, vr, len(pr.records)),
		Errors:   vr.errors,
		Warnings: vr.warnings,
		AIUsed:   ar.aiUsed,
	}

	return result, nil
}

// recordsFromMaps converts []map[string]string to []NormalizedRecord.
func recordsFromMaps(rows []map[string]string) []NormalizedRecord {
	records := make([]NormalizedRecord, 0, len(rows))

	for i, row := range rows {
		record := NormalizedRecord{
			RowNumber:  i + 1,
			RawData:    copyMap(row),
			Age:        safeParseInt(row["age"]),
			Sex:        row["sex"],
			HeightCm:   safeParseFloat(row["height_cm"]),
			WeightKg:   safeParseFloat(row["weight_kg"]),
			BMI:        safeParseFloat(row["bmi"]),
			VitaminD:   safeParseFloat(row["vitamin_d"]),
			Laterality: row["laterality"],
		}

		// Parse dates
		record.FractureDate = safeParseDate(row["fracture_date"])
		record.ERDate = safeParseDate(row["er_date"])
		record.SurgeryDate = safeParseDate(row["surgery_date"])

		// String fields
		record.InjuryMechanism = row["injury_mechanism"]
		record.TraumaEnergy = row["trauma_energy"]
		record.OpenClosed = row["open_closed"]
		record.EmergencyTreatment = row["emergency_treatment"]
		record.SurgeryReason = row["surgery_reason"]
		record.DisplacementTreatment = row["displacement_treatment"]

		// Operative notes - use surgery_type or operative_notes
		if row["operative_notes"] != "" {
			record.OperativeNotes = row["operative_notes"]
		} else if row["surgery_type"] != "" {
			record.OperativeNotes = row["surgery_type"]
		}

		// Array fields (comma-separated)
		record.AssociatedInjuries = splitAndTrim(row["associated_injuries"], ",")
		record.PreSurgicalComplications = splitAndTrim(row["presurgical_complications"], ",")
		record.PostopComplications = splitAndTrim(row["postop_complications"], ",")

		// Approaches - prefer AI-extracted, fallback to manual
		if row["ai_approaches"] != "" {
			record.Approaches = splitAndTrim(row["ai_approaches"], ",")
		} else {
			record.Approaches = splitAndTrim(row["approaches"], ",")
		}

		// Boolean fields
		record.PreopCT = safeParseBool(row["preop_ct"])
		record.Anticoagulation = safeParseBool(row["anticoagulation"])
		record.SecondaryDisplacement = safeParseBool(row["secondary_displacement"])

		// Syndesmosis - prefer AI-extracted
		if row["ai_syndesmosis_repaired"] != "" {
			record.SyndesmosisRepair = safeParseBool(row["ai_syndesmosis_repaired"])
		} else {
			record.SyndesmosisRepair = safeParseBool(row["syndesmosis"])
		}
		record.SyndesmosisType = row["ai_syndesmosis_type"]

		// Extracted implants (JSON)
		if row["extracted_implants"] != "" {
			var implants []ExtractedImplant
			if err := json.Unmarshal([]byte(row["extracted_implants"]), &implants); err == nil {
				record.ExtractedImplants = implants
			}
		}

		records = append(records, record)
	}

	return records
}

// safeParseInt parses a string to int pointer, returns nil on error or empty.
func safeParseInt(s string) *int {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	val, err := strconv.Atoi(s)
	if err != nil {
		return nil
	}
	return &val
}

// safeParseFloat parses a string to float64 pointer, returns nil on error or empty.
func safeParseFloat(s string) *float64 {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	val, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return nil
	}
	return &val
}

// safeParseDate parses a date string (expecting YYYY-MM-DD format from normalization).
func safeParseDate(s string) *time.Time {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return nil
	}
	return &t
}

// safeParseBool parses a boolean value from string.
func safeParseBool(s string) bool {
	s = strings.TrimSpace(strings.ToLower(s))
	return s == "true" || s == "yes" || s == "si" || s == "1"
}

// splitAndTrim splits a string by separator and trims each element.
// Returns nil for empty strings.
func splitAndTrim(s, sep string) []string {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}

	parts := strings.Split(s, sep)
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}

	if len(result) == 0 {
		return nil
	}
	return result
}

// copyMap creates a deep copy of a map.
func copyMap(m map[string]string) map[string]string {
	copy := make(map[string]string, len(m))
	for k, v := range m {
		copy[k] = v
	}
	return copy
}

// aggregateLogs combines logs from all phases.
func aggregateLogs(logs ...[]LogEntry) []LogEntry {
	totalLen := 0
	for _, log := range logs {
		totalLen += len(log)
	}

	result := make([]LogEntry, 0, totalLen)
	for _, log := range logs {
		result = append(result, log...)
	}
	return result
}

// aggregateStats combines statistics from all phases.
func aggregateStats(pr *parseResult, cr *cleanResult, nr *normalizeResult, ar *aiNormalizeResult, vr *validateResult, totalRowsBeforeClean int) PipelineStats {
	// Count valid and partial records
	validRecords := 0
	partialRecords := 0

	// Build a map of rows with errors
	errorRows := make(map[int]bool)
	for _, err := range vr.errors {
		errorRows[err.Row] = true
	}

	// Build a map of rows with warnings
	warningRows := make(map[int]bool)
	for _, warn := range vr.warnings {
		warningRows[warn.Row] = true
	}

	// Count based on error/warning status
	totalRecords := len(pr.records)
	for row := 1; row <= totalRecords; row++ {
		hasError := errorRows[row]
		hasWarning := warningRows[row]

		if !hasError && !hasWarning {
			validRecords++
		} else if !hasError && hasWarning {
			partialRecords++
		}
		// Records with errors are neither valid nor partial
	}

	return PipelineStats{
		TotalRows:        totalRowsBeforeClean,
		ValidRecords:     validRecords,
		PartialRecords:   partialRecords,
		DroppedRows:      0, // Not tracked in current implementation
		EmptyRowsRemoved: pr.emptyRowsRemoved,
		EmptyColsRemoved: pr.emptyColsRemoved,
		CellsCleaned:     cr.cellsCleaned,
		DatesNormalized:  nr.datesNormalized,
		EnumsMapped:      nr.enumsMapped,
		AIExtractions:    ar.aiExtractions,
		AIFallbacks:      ar.aiFallbacks,
		WarningsCount:    len(vr.warnings),
		ErrorsCount:      len(vr.errors),
	}
}
