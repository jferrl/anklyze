package normalization

import (
	"encoding/csv"
	"fmt"
	"strings"
	"unicode/utf8"

	"golang.org/x/text/encoding/charmap"
)

// detectEncoding detects the character encoding of the CSV data.
func detectEncoding(data []byte) string {
	if len(data) == 0 {
		return "utf-8"
	}

	// Check for UTF-8 BOM
	if len(data) >= 3 && data[0] == 0xEF && data[1] == 0xBB && data[2] == 0xBF {
		return "utf-8"
	}

	// Check if valid UTF-8
	if utf8.Valid(data) {
		return "utf-8"
	}

	// Check for CP1252-specific bytes
	for _, b := range data {
		// 0x85: ellipsis, 0x92: right single quote, 0x93/0x94: smart double quotes
		if b == 0x85 || b == 0x92 || b == 0x93 || b == 0x94 {
			return "cp1252"
		}
	}

	// Default to latin-1 for non-UTF8 data
	return "latin-1"
}

// decodeToUTF8 converts the input data to UTF-8 based on detected encoding.
func decodeToUTF8(data []byte, enc string) (string, error) {
	switch enc {
	case "utf-8":
		// Strip UTF-8 BOM if present
		if len(data) >= 3 && data[0] == 0xEF && data[1] == 0xBB && data[2] == 0xBF {
			data = data[3:]
		}
		return strings.TrimRight(string(data), "\x00"), nil

	case "cp1252":
		decoded, err := charmap.Windows1252.NewDecoder().Bytes(data)
		if err != nil {
			return "", fmt.Errorf("failed to decode CP1252: %w", err)
		}

		// After CP1252 decode, special chars are now Unicode code points.
		// Replace them with ASCII equivalents.
		s := string(decoded)
		s = strings.ReplaceAll(s, "\u2026", "...") // ellipsis (was 0x85)
		s = strings.ReplaceAll(s, "\u2019", "'")    // right single quote (was 0x92)
		s = strings.ReplaceAll(s, "\u201C", `"`)    // left double quote (was 0x93)
		s = strings.ReplaceAll(s, "\u201D", `"`)    // right double quote (was 0x94)

		return strings.TrimRight(s, "\x00"), nil

	case "latin-1":
		decoded, err := charmap.ISO8859_1.NewDecoder().Bytes(data)
		if err != nil {
			return "", fmt.Errorf("failed to decode Latin-1: %w", err)
		}
		return strings.TrimRight(string(decoded), "\x00"), nil

	default:
		return "", fmt.Errorf("unsupported encoding: %s", enc)
	}
}

// detectDelimiter detects the CSV delimiter from the first line.
func detectDelimiter(text string) rune {
	if text == "" {
		return ','
	}

	// Extract first line
	firstLine := text
	if idx := strings.Index(text, "\n"); idx != -1 {
		firstLine = text[:idx]
	}

	// Count delimiter occurrences
	counts := map[rune]int{
		',':  strings.Count(firstLine, ","),
		';':  strings.Count(firstLine, ";"),
		'\t': strings.Count(firstLine, "\t"),
	}

	// Find the most frequent delimiter
	maxCount := 0
	delimiter := ','
	for delim, count := range counts {
		if count > maxCount {
			maxCount = count
			delimiter = delim
		}
	}

	return delimiter
}

// parseCSV parses CSV text into a 2D slice of strings.
func parseCSV(text string, delimiter rune) ([][]string, error) {
	reader := csv.NewReader(strings.NewReader(text))
	reader.Comma = delimiter
	reader.LazyQuotes = true
	reader.FieldsPerRecord = -1
	reader.TrimLeadingSpace = true

	records, err := reader.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("failed to parse CSV: %w", err)
	}

	return records, nil
}

// mapColumns maps CSV headers to internal field names.
func mapColumns(headers []string) (map[int]string, []string) {
	mapping := make(map[int]string)
	var unmapped []string

	for i, header := range headers {
		normalized := strings.ToLower(strings.TrimSpace(header))
		if targetField, ok := columnAliases[normalized]; ok {
			mapping[i] = targetField
		} else if normalized != "" {
			unmapped = append(unmapped, header)
		}
	}

	return mapping, unmapped
}

// dropEmptyColumns removes columns where all values are empty.
func dropEmptyColumns(records [][]string) ([][]string, int) {
	if len(records) == 0 {
		return records, 0
	}

	// Find maximum column count
	maxCols := 0
	for _, row := range records {
		if len(row) > maxCols {
			maxCols = len(row)
		}
	}

	if maxCols == 0 {
		return records, 0
	}

	// Check which columns are completely empty
	emptyColumns := make([]bool, maxCols)
	for i := 0; i < maxCols; i++ {
		isEmpty := true
		for _, row := range records {
			if i < len(row) && strings.TrimSpace(row[i]) != "" {
				isEmpty = false
				break
			}
		}
		emptyColumns[i] = isEmpty
	}

	// Build new records without empty columns
	var result [][]string
	droppedCount := 0

	for _, row := range records {
		var newRow []string
		for i := 0; i < len(row); i++ {
			if !emptyColumns[i] {
				newRow = append(newRow, row[i])
			}
		}
		result = append(result, newRow)
	}

	for _, isEmpty := range emptyColumns {
		if isEmpty {
			droppedCount++
		}
	}

	return result, droppedCount
}

// dropEmptyRows removes rows where all mapped values are empty.
func dropEmptyRows(records []map[string]string) ([]map[string]string, int) {
	var result []map[string]string
	droppedCount := 0

	for _, record := range records {
		isEmpty := true
		for _, value := range record {
			if strings.TrimSpace(value) != "" {
				isEmpty = false
				break
			}
		}

		if isEmpty {
			droppedCount++
		} else {
			result = append(result, record)
		}
	}

	return result, droppedCount
}

// parsePhase orchestrates the parsing phase of CSV normalization.
func parsePhase(csvData []byte) (*parseResult, error) {
	// Step 1: Detect encoding
	encoding := detectEncoding(csvData)

	// Step 2: Decode to UTF-8
	text, err := decodeToUTF8(csvData, encoding)
	if err != nil {
		return nil, fmt.Errorf("encoding conversion failed: %w", err)
	}

	// Step 3: Detect delimiter
	delimiter := detectDelimiter(text)

	// Step 4: Parse CSV
	rawRecords, err := parseCSV(text, delimiter)
	if err != nil {
		return nil, err
	}

	// Step 5: Validate we have at least header + 1 data row
	if len(rawRecords) < 2 {
		return nil, fmt.Errorf("CSV must contain at least a header row and one data row, got %d row(s)", len(rawRecords))
	}

	// Step 6: Drop empty columns
	records, emptyColsRemoved := dropEmptyColumns(rawRecords)

	// Step 7: Extract headers and map columns
	headers := records[0]
	columnMapping, unmappedCols := mapColumns(headers)

	// Step 8: Convert data rows to map[string]string
	var mappedRecords []map[string]string
	for i := 1; i < len(records); i++ {
		row := records[i]
		record := make(map[string]string)

		for colIdx, fieldName := range columnMapping {
			if colIdx < len(row) {
				record[fieldName] = row[colIdx]
			} else {
				record[fieldName] = ""
			}
		}

		mappedRecords = append(mappedRecords, record)
	}

	// Step 9: Drop empty rows
	cleanedRecords, emptyRowsRemoved := dropEmptyRows(mappedRecords)

	// Step 10: Build log entries
	var log []LogEntry

	// Log encoding conversion
	if encoding != "utf-8" {
		log = append(log, LogEntry{
			Row:             0,
			Column:          "_file",
			OriginalValue:   encoding,
			NormalizedValue: "utf-8",
			Action:          "encoding_conversion",
			Severity:        "info",
		})
	}

	// Log delimiter detection
	delimiterName := string(delimiter)
	if delimiter == '\t' {
		delimiterName = "tab"
	}
	log = append(log, LogEntry{
		Row:             0,
		Column:          "_file",
		OriginalValue:   "",
		NormalizedValue: delimiterName,
		Action:          "delimiter_detected",
		Severity:        "info",
	})

	// Log dropped columns
	if emptyColsRemoved > 0 {
		log = append(log, LogEntry{
			Row:             0,
			Column:          "_structure",
			OriginalValue:   fmt.Sprintf("%d empty columns", emptyColsRemoved),
			NormalizedValue: "dropped",
			Action:          "drop_empty_columns",
			Severity:        "info",
		})
	}

	// Log dropped rows
	if emptyRowsRemoved > 0 {
		log = append(log, LogEntry{
			Row:             0,
			Column:          "_structure",
			OriginalValue:   fmt.Sprintf("%d empty rows", emptyRowsRemoved),
			NormalizedValue: "dropped",
			Action:          "drop_empty_rows",
			Severity:        "info",
		})
	}

	// Step 11: Return result
	return &parseResult{
		records:          cleanedRecords,
		unmappedCols:     unmappedCols,
		log:              log,
		emptyRowsRemoved: emptyRowsRemoved,
		emptyColsRemoved: emptyColsRemoved,
	}, nil
}
