package normalization

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

// Regex patterns for implant extraction (compiled at package level)
var (
	platePattern            = regexp.MustCompile(`(?i)placa\s+(\w+(?:\s+\w+)?)\s+(?:.*?)(\d+)\s*(?:H|agujeros|orificios)`)
	cannulatedScrewPattern  = regexp.MustCompile(`(?i)(\d+)\s*tornillos?\s*canulados?\s*(?:mini\s*-?\s*monster|minimonster|minimoster)?\s*(\d+(?:[.,]\d+)?)\s*(?:mm)?`)
	sutureButtonPattern     = regexp.MustCompile(`(?i)(tight\s*-?\s*rope|tightrope|zip\s*-?\s*tigh(?:t)?)\s*(\w*)`)
	nailPattern             = regexp.MustCompile(`(?i)clavo\s+(\w+)\s+(\d+)\s*(?:mm)?\s*[xX]\s*(\d+)`)
	corticalScrewPattern    = regexp.MustCompile(`(?i)(\d+)\s*tornillos?\s*(?:corticales?|cortical)\s*(\d+(?:[.,]\d+)?)\s*(?:mm)?`)
	genericScrewPattern     = regexp.MustCompile(`(?i)(\d+)\s*tornillos?\s+(\d+(?:[.,]\d+)?)\s*(?:mm)`)
)

// Injury patterns for associated injuries extraction
var injuryPatterns = []struct {
	pattern *regexp.Regexp
	value   string
}{
	{regexp.MustCompile(`(?i)luxacion\s*autorreducida`), "dislocation_auto_reduced"},
	{regexp.MustCompile(`(?i)\bluxacion\b`), "dislocation"},
	{regexp.MustCompile(`(?i)subluxacion`), "subluxation"},
	{regexp.MustCompile(`(?i)pilon\s*tibial`), "tibial_pilon_fracture"},
	{regexp.MustCompile(`(?i)mais+on`), "maisonneuve_fracture"},
	{regexp.MustCompile(`(?i)wagstaff?e`), "wagstaffe_fracture"},
	{regexp.MustCompile(`(?i)vertebral`), "vertebral_fracture"},
	{regexp.MustCompile(`(?i)pelvis`), "pelvic_fracture"},
	{regexp.MustCompile(`(?i)diafisaria.*perone`), "fibular_shaft_fracture"},
}

// AIExtractor handles AI-assisted and regex-based extraction.
type AIExtractor struct {
	client LLMClient
	lang   string
}

// newAIExtractor creates a new AIExtractor.
// If client is nil, all operations fall back to regex extraction.
func newAIExtractor(client LLMClient, lang string) *AIExtractor {
	return &AIExtractor{
		client: client,
		lang:   lang,
	}
}

// ExtractSurgeryData extracts structured surgery data from free text.
// Uses AI if client is available, falls back to regex on error or if client is nil.
func (e *AIExtractor) ExtractSurgeryData(ctx context.Context, surgeryText string) (*SurgeryExtraction, error) {
	if e.client == nil {
		return regexExtractSurgeryData(surgeryText), nil
	}

	systemPrompt := `Eres un asistente médico especializado en extraer información estructurada de notas quirúrgicas de fracturas de tobillo.
Extrae la siguiente información del texto en formato JSON:
- implants: lista de implantes usados (malleolus, type, brand, model, size, count)
- approaches: lista de abordajes quirúrgicos (lateral, medial, posterolateral, etc.)
- malleoli: lista de maleolos tratados (lateral, medial, posterior)
- techniques: lista de técnicas especiales usadas
- syndesmosis: información sobre reparación de sindesmosis (repaired: bool, type: string, brand: string)

Tipos de implantes: "plate", "cannulated_screw", "cortical_screw", "nail", "suture_button"
Responde únicamente con JSON válido, sin texto adicional.`

	userPrompt := fmt.Sprintf("Texto quirúrgico:\n%s", surgeryText)

	jsonResp, err := e.client.GenerateJSON(ctx, systemPrompt, userPrompt)
	if err != nil {
		// AI failed, fall back to regex
		return regexExtractSurgeryData(surgeryText), nil
	}

	var extraction SurgeryExtraction
	if err := json.Unmarshal([]byte(jsonResp), &extraction); err != nil {
		// JSON parsing failed, fall back to regex
		return regexExtractSurgeryData(surgeryText), nil
	}

	return &extraction, nil
}

// NormalizeAssociatedInjuries extracts and normalizes associated injuries from free text.
// Uses AI if client is available, falls back to regex on error or if client is nil.
func (e *AIExtractor) NormalizeAssociatedInjuries(ctx context.Context, text string) ([]string, error) {
	if e.client == nil {
		return regexExtractAssociatedInjuries(text), nil
	}

	systemPrompt := `Eres un asistente médico especializado en identificar lesiones asociadas en traumatismos de tobillo.
Extrae todas las lesiones mencionadas y devuelve una lista JSON de valores normalizados.
Valores posibles: "dislocation", "dislocation_auto_reduced", "subluxation", "tibial_pilon_fracture",
"maisonneuve_fracture", "wagstaffe_fracture", "vertebral_fracture", "pelvic_fracture", "fibular_shaft_fracture"
Responde únicamente con un array JSON, sin texto adicional.`

	userPrompt := fmt.Sprintf("Texto clínico:\n%s", text)

	jsonResp, err := e.client.GenerateJSON(ctx, systemPrompt, userPrompt)
	if err != nil {
		return regexExtractAssociatedInjuries(text), nil
	}

	var injuries []string
	if err := json.Unmarshal([]byte(jsonResp), &injuries); err != nil {
		return regexExtractAssociatedInjuries(text), nil
	}

	return injuries, nil
}

// NormalizeApproaches extracts and normalizes surgical approaches from free text.
// Uses AI if client is available, falls back to regex on error or if client is nil.
func (e *AIExtractor) NormalizeApproaches(ctx context.Context, text string) ([]string, error) {
	if e.client == nil {
		return regexExtractApproaches(text), nil
	}

	systemPrompt := `Eres un asistente médico especializado en identificar abordajes quirúrgicos en cirugía de tobillo.
Extrae todos los abordajes mencionados y devuelve una lista JSON de valores normalizados.
Valores posibles: "lateral", "medial", "posterolateral", "posteromedial", "anterolateral", "anteromedial",
"percutaneous_medial", "percutaneous", "intramedullary_nail", "mini_open_anterolateral", "posterior"
Responde únicamente con un array JSON, sin texto adicional.`

	userPrompt := fmt.Sprintf("Texto quirúrgico:\n%s", text)

	jsonResp, err := e.client.GenerateJSON(ctx, systemPrompt, userPrompt)
	if err != nil {
		return regexExtractApproaches(text), nil
	}

	var approaches []string
	if err := json.Unmarshal([]byte(jsonResp), &approaches); err != nil {
		return regexExtractApproaches(text), nil
	}

	return approaches, nil
}

// regexExtractSurgeryData extracts surgery data using pure regex patterns.
func regexExtractSurgeryData(text string) *SurgeryExtraction {
	extraction := &SurgeryExtraction{
		Implants:   regexExtractImplants(text),
		Approaches: regexExtractApproaches(text),
		Malleoli:   []string{},
		Techniques: []string{},
	}

	// Detect syndesmosis repair
	lowerText := strings.ToLower(text)
	if strings.Contains(lowerText, "sindesmosis") || strings.Contains(lowerText, "tight") ||
		strings.Contains(lowerText, "zip") || strings.Contains(lowerText, "jugger") {

		// Extract syndesmosis info from implants
		for _, implant := range extraction.Implants {
			if implant.Type == "suture_button" || implant.Malleolus == "syndesmosis" {
				extraction.Syndesmosis = &SyndesmosisInfo{
					Repaired: true,
					Type:     implant.Type,
					Brand:    implant.Brand,
				}
				break
			}
		}

		// If not found in implants but mentioned, mark as repaired
		if extraction.Syndesmosis == nil {
			extraction.Syndesmosis = &SyndesmosisInfo{
				Repaired: true,
				Type:     "suture_button",
				Brand:    "",
			}
		}
	}

	return extraction
}

// regexExtractImplants extracts implants from surgical text using regex patterns.
func regexExtractImplants(text string) []ExtractedImplant {
	var implants []ExtractedImplant
	lowerText := strings.ToLower(text)

	// Extract plates
	plateMatches := platePattern.FindAllStringSubmatch(text, -1)
	for _, match := range plateMatches {
		if len(match) >= 3 {
			brand := normalizeBrand(match[1])
			size := match[2] + "H"
			malleolus := detectMalleolus(text, match[0])

			implants = append(implants, ExtractedImplant{
				Malleolus: malleolus,
				Type:      "plate",
				Brand:     brand,
				Model:     "",
				Size:      size,
				Count:     1,
			})
		}
	}

	// Extract cannulated screws
	cannulatedMatches := cannulatedScrewPattern.FindAllStringSubmatch(text, -1)
	for _, match := range cannulatedMatches {
		if len(match) >= 3 {
			count, _ := strconv.Atoi(match[1])
			if count == 0 {
				count = 1
			}
			size := strings.ReplaceAll(match[2], ",", ".")
			malleolus := detectMalleolus(text, match[0])

			// Detect brand from context
			brand := "Paragon MiniMonster"
			if strings.Contains(strings.ToLower(match[0]), "minimonster") ||
			   strings.Contains(strings.ToLower(match[0]), "minimoster") {
				brand = "Paragon MiniMonster"
			}

			implants = append(implants, ExtractedImplant{
				Malleolus: malleolus,
				Type:      "cannulated_screw",
				Brand:     brand,
				Model:     "",
				Size:      size,
				Count:     count,
			})
		}
	}

	// Extract cortical screws
	corticalMatches := corticalScrewPattern.FindAllStringSubmatch(text, -1)
	for _, match := range corticalMatches {
		if len(match) >= 3 {
			count, _ := strconv.Atoi(match[1])
			if count == 0 {
				count = 1
			}
			size := strings.ReplaceAll(match[2], ",", ".")
			malleolus := detectMalleolus(text, match[0])

			implants = append(implants, ExtractedImplant{
				Malleolus: malleolus,
				Type:      "cortical_screw",
				Brand:     "",
				Model:     "",
				Size:      size,
				Count:     count,
			})
		}
	}

	// Extract suture buttons / tight rope
	sutureMatches := sutureButtonPattern.FindAllStringSubmatch(text, -1)
	for _, match := range sutureMatches {
		if len(match) >= 2 {
			brand := normalizeBrand(match[1])
			// Only use match[2] if match[1] didn't normalize to a known brand
			if brand == strings.ToLower(strings.TrimSpace(match[1])) && len(match) > 2 && match[2] != "" {
				additionalBrand := normalizeBrand(match[2])
				if additionalBrand != strings.ToLower(strings.TrimSpace(match[2])) {
					brand = additionalBrand
				}
			}

			implants = append(implants, ExtractedImplant{
				Malleolus: "syndesmosis",
				Type:      "suture_button",
				Brand:     brand,
				Model:     "",
				Size:      "",
				Count:     1,
			})
		}
	}

	// Extract intramedullary nails
	nailMatches := nailPattern.FindAllStringSubmatch(text, -1)
	for _, match := range nailMatches {
		if len(match) >= 4 {
			model := match[1]
			size := match[2] + "mm x " + match[3] + "mm"

			implants = append(implants, ExtractedImplant{
				Malleolus: "medial",
				Type:      "nail",
				Brand:     "",
				Model:     model,
				Size:      size,
				Count:     1,
			})
		}
	}

	// Extract generic screws (only if not already captured)
	if !strings.Contains(lowerText, "canulado") && !strings.Contains(lowerText, "cortical") {
		genericMatches := genericScrewPattern.FindAllStringSubmatch(text, -1)
		for _, match := range genericMatches {
			if len(match) >= 3 {
				count, _ := strconv.Atoi(match[1])
				if count == 0 {
					count = 1
				}
				size := strings.ReplaceAll(match[2], ",", ".")
				malleolus := detectMalleolus(text, match[0])

				implants = append(implants, ExtractedImplant{
					Malleolus: malleolus,
					Type:      "cannulated_screw",
					Brand:     "",
					Model:     "",
					Size:      size,
					Count:     count,
				})
			}
		}
	}

	return implants
}

// detectMalleolus detects which malleolus an implant belongs to based on context.
func detectMalleolus(fullText, matchText string) string {
	// Find position of match in full text
	idx := strings.Index(strings.ToLower(fullText), strings.ToLower(matchText))
	if idx == -1 {
		return ""
	}

	// Look in surrounding context (100 chars before and after)
	start := idx - 100
	if start < 0 {
		start = 0
	}
	end := idx + len(matchText) + 100
	if end > len(fullText) {
		end = len(fullText)
	}
	context := strings.ToLower(fullText[start:end])

	// Check for malleolus indicators
	if strings.Contains(context, "lateral") {
		if strings.Contains(context, "posterolateral") {
			return "posterior"
		}
		return "lateral"
	}
	if strings.Contains(context, "medial") {
		return "medial"
	}
	if strings.Contains(context, "posterior") {
		return "posterior"
	}
	if strings.Contains(context, "sindesmosis") {
		return "syndesmosis"
	}

	return ""
}

// regexExtractAssociatedInjuries extracts associated injuries using regex patterns.
func regexExtractAssociatedInjuries(text string) []string {
	var injuries []string
	seen := make(map[string]bool)

	lowerText := strings.ToLower(text)

	// Check each pattern (more specific patterns first)
	for _, ip := range injuryPatterns {
		if ip.pattern.MatchString(lowerText) {
			if !seen[ip.value] {
				injuries = append(injuries, ip.value)
				seen[ip.value] = true
			}
		}
	}

	// Remove generic "dislocation" if the more specific "auto_reduced" was matched,
	// since "luxacion autorreducida" also contains "luxacion".
	if seen["dislocation_auto_reduced"] && seen["dislocation"] {
		filtered := injuries[:0]
		for _, inj := range injuries {
			if inj != "dislocation" {
				filtered = append(filtered, inj)
			}
		}
		injuries = filtered
	}

	return injuries
}

// regexExtractApproaches extracts surgical approaches using regex and text processing.
func regexExtractApproaches(text string) []string {
	// Remove clinical questions (anything after and including "?")
	if idx := strings.Index(text, "?"); idx != -1 {
		text = text[:idx]
	}

	// Replace "/" and " y " with "+"
	text = strings.ReplaceAll(text, "/", "+")
	text = strings.ReplaceAll(text, " y ", "+")
	text = strings.ReplaceAll(text, " Y ", "+")

	// Split by "+"
	parts := strings.Split(text, "+")

	var approaches []string
	seen := make(map[string]bool)

	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}

		// Normalize using approach map
		normalized := strings.ToLower(part)
		if mapped, ok := approachMap[normalized]; ok {
			if !seen[mapped] {
				approaches = append(approaches, mapped)
				seen[mapped] = true
			}
		} else {
			// Try partial matching for complex approaches
			for key, value := range approachMap {
				if strings.Contains(normalized, key) {
					if !seen[value] {
						approaches = append(approaches, value)
						seen[value] = true
					}
					break
				}
			}
		}
	}

	return approaches
}

// aiNormalizePhase performs Phase 3b: AI-assisted normalization with regex fallback.
func aiNormalizePhase(ctx context.Context, records []map[string]string, client LLMClient, lang string) *aiNormalizeResult {
	result := &aiNormalizeResult{
		records:       make([]map[string]string, len(records)),
		log:           []LogEntry{},
		aiUsed:        client != nil,
		aiExtractions: 0,
		aiFallbacks:   0,
	}

	// Copy records for transformation
	for i, rec := range records {
		result.records[i] = make(map[string]string)
		for k, v := range rec {
			result.records[i][k] = v
		}
	}

	extractor := newAIExtractor(client, lang)

	for i, rec := range result.records {
		rowNum := i + 1

		// Extract surgery data from surgery_type field
		if surgeryText, exists := rec["surgery_type"]; exists && surgeryText != "" {
			extraction, err := extractor.ExtractSurgeryData(ctx, surgeryText)

			var action string
			if client == nil {
				action = "regex_extracted"
				result.aiFallbacks++
			} else if err != nil {
				action = "ai_fallback"
				result.aiFallbacks++
			} else {
				action = "ai_extracted"
				result.aiExtractions++
			}

			if extraction != nil {
				// Store extracted implants as JSON
				if len(extraction.Implants) > 0 {
					implantsJSON, _ := json.Marshal(extraction.Implants)
					result.records[i]["extracted_implants"] = string(implantsJSON)

					result.log = append(result.log, LogEntry{
						Row:             rowNum,
						Column:          "extracted_implants",
						OriginalValue:   surgeryText,
						NormalizedValue: string(implantsJSON),
						Action:          action,
						Severity:        "info",
					})
				}

				// Store AI-extracted approaches
				if len(extraction.Approaches) > 0 {
					approachesStr := strings.Join(extraction.Approaches, ",")
					result.records[i]["ai_approaches"] = approachesStr

					result.log = append(result.log, LogEntry{
						Row:             rowNum,
						Column:          "ai_approaches",
						OriginalValue:   surgeryText,
						NormalizedValue: approachesStr,
						Action:          action,
						Severity:        "info",
					})
				}

				// Store syndesmosis information
				if extraction.Syndesmosis != nil {
					if extraction.Syndesmosis.Repaired {
						result.records[i]["ai_syndesmosis_repaired"] = "true"
					} else {
						result.records[i]["ai_syndesmosis_repaired"] = "false"
					}
					result.records[i]["ai_syndesmosis_type"] = extraction.Syndesmosis.Type

					result.log = append(result.log, LogEntry{
						Row:             rowNum,
						Column:          "ai_syndesmosis_repaired",
						OriginalValue:   surgeryText,
						NormalizedValue: extraction.Syndesmosis.Type,
						Action:          action,
						Severity:        "info",
					})
				}
			}
		}

		// Normalize associated injuries
		if injuriesText, exists := rec["associated_injuries"]; exists && injuriesText != "" {
			injuries, err := extractor.NormalizeAssociatedInjuries(ctx, injuriesText)

			var action string
			if client == nil {
				action = "regex_extracted"
				result.aiFallbacks++
			} else if err != nil {
				action = "ai_fallback"
				result.aiFallbacks++
			} else {
				action = "ai_extracted"
				result.aiExtractions++
			}

			if len(injuries) > 0 {
				normalized := strings.Join(injuries, ",")
				result.records[i]["associated_injuries"] = normalized

				result.log = append(result.log, LogEntry{
					Row:             rowNum,
					Column:          "associated_injuries",
					OriginalValue:   injuriesText,
					NormalizedValue: normalized,
					Action:          action,
					Severity:        "info",
				})
			}
		}

		// Normalize approaches (if not already normalized and field exists)
		if approachesText, exists := rec["approaches"]; exists && approachesText != "" {
			// Check if already normalized (AI might have done it)
			if _, aiDone := rec["ai_approaches"]; !aiDone {
				approaches, err := extractor.NormalizeApproaches(ctx, approachesText)

				var action string
				if client == nil {
					action = "regex_extracted"
					result.aiFallbacks++
				} else if err != nil {
					action = "ai_fallback"
					result.aiFallbacks++
				} else {
					action = "ai_extracted"
					result.aiExtractions++
				}

				if len(approaches) > 0 {
					normalized := strings.Join(approaches, ",")
					result.records[i]["approaches"] = normalized

					result.log = append(result.log, LogEntry{
						Row:             rowNum,
						Column:          "approaches",
						OriginalValue:   approachesText,
						NormalizedValue: normalized,
						Action:          action,
						Severity:        "info",
					})
				}
			}
		}
	}

	return result
}
