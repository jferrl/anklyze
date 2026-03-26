package service

import (
	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/statistics"
)

// StatisticsService provides inter-rater reliability calculations.
type StatisticsService struct{}

// NewStatisticsService creates a new statistics service.
func NewStatisticsService() *StatisticsService {
	return &StatisticsService{}
}

// CalculateReliabilityMetrics calculates all reliability metrics for a case.
func (s *StatisticsService) CalculateReliabilityMetrics(
	caseID uuid.UUID,
	responses []domain.CaseResponse,
) (*domain.ReliabilityMetrics, error) {
	if len(responses) == 0 {
		return nil, nil
	}

	// Count unique raters
	uniqueRaters := make(map[string]bool)
	for _, r := range responses {
		uniqueRaters[r.UserID.String()] = true
	}

	metrics := &domain.ReliabilityMetrics{
		CaseID:         caseID,
		TotalResponses: int64(len(responses)),
		UniqueRaters:   int64(len(uniqueRaters)),
	}

	// Calculate per-system agreement
	metrics.DanisWeberAgreement = s.calculateSystemAgreement(responses, "danis_weber")
	metrics.LaugeHansenAgreement = s.calculateSystemAgreement(responses, "lauge_hansen")
	metrics.AOOTAAgreement = s.calculateSystemAgreement(responses, "ao_ota")
	metrics.BartonicekAgreement = s.calculateSystemAgreement(responses, "bartonicek")

	return metrics, nil
}

// calculateSystemAgreement calculates agreement metrics for a single classification system.
func (s *StatisticsService) calculateSystemAgreement(responses []domain.CaseResponse, system string) *domain.SystemAgreement {
	// Extract classifications for this system
	var classifications []string
	for _, r := range responses {
		var val *string
		switch system {
		case "danis_weber":
			val = r.DanisWeberType
		case "lauge_hansen":
			val = r.LaugeHansenType
		case "ao_ota":
			val = r.AOOTACode
		case "bartonicek":
			val = r.BartonicekType
		}
		if val != nil {
			classifications = append(classifications, *val)
		}
	}

	if len(classifications) == 0 {
		return nil
	}

	agreement := &domain.SystemAgreement{
		System:         system,
		CategoryCounts: statistics.CategoryCounts(classifications),
	}

	// Calculate percent agreement (mode frequency / total)
	if len(classifications) > 1 {
		agreement.PercentAgreement = statistics.PercentAgreement(classifications) * 100
	} else {
		agreement.PercentAgreement = 100
	}

	// For 2 unique raters, calculate Cohen's Kappa
	// For more, calculate Fleiss' Kappa
	uniqueUsers := make(map[string][]string)
	for _, r := range responses {
		var val *string
		switch system {
		case "danis_weber":
			val = r.DanisWeberType
		case "lauge_hansen":
			val = r.LaugeHansenType
		case "ao_ota":
			val = r.AOOTACode
		case "bartonicek":
			val = r.BartonicekType
		}
		if val != nil {
			uniqueUsers[r.UserID.String()] = append(uniqueUsers[r.UserID.String()], *val)
		}
	}

	numRaters := len(uniqueUsers)
	if numRaters == 2 {
		// Cohen's Kappa for 2 raters
		// Use the most recent (latest) response from each user
		var raters []string
		for userID := range uniqueUsers {
			raters = append(raters, userID)
		}
		if len(uniqueUsers[raters[0]]) > 0 && len(uniqueUsers[raters[1]]) > 0 {
			// Use last response (most recent) instead of first
			lastIdx0 := len(uniqueUsers[raters[0]]) - 1
			lastIdx1 := len(uniqueUsers[raters[1]]) - 1
			ratings := [][2]string{
				{uniqueUsers[raters[0]][lastIdx0], uniqueUsers[raters[1]][lastIdx1]},
			}
			kappa, ci, _ := statistics.CohensKappaWithCI(ratings, 0.95)
			agreement.CohensKappa = &kappa
			agreement.CohensKappaCI = ci

			// For AO/OTA, also calculate weighted Kappa (ordinal categories)
			if system == "ao_ota" {
				weightType := domain.KappaWeightLinear
				weightedKappa, _ := statistics.WeightedKappa(ratings, statistics.AOOTAOrdering, weightType)
				agreement.WeightedKappa = &weightedKappa
				agreement.WeightedKappaType = &weightType
			}
		}
	} else if numRaters > 2 {
		// Fleiss' Kappa for multiple raters
		// NOTE: Fleiss' Kappa requires multiple subjects (cases) to be meaningful.
		// Current case design has a single case, so we cannot properly calculate
		// inter-rater reliability using Fleiss' Kappa.
		//
		// The formula requires a matrix where:
		// - Each ROW = one subject (case/patient)
		// - Each COLUMN = one category
		// - Each cell = count of raters choosing that category for that subject
		//
		// With only 1 subject, we can only calculate within-case agreement,
		// not across-case reliability. Return translation key for frontend to display.
		noteKey := "fleiss_kappa_single_case_limitation"
		agreement.FleissKappaNote = &noteKey
		// FleissKappa remains nil
	}

	return agreement
}

// ============================================================================
// Study Reliability Metrics
// ============================================================================

// CalculateStudyReliabilityMetrics calculates reliability metrics across multiple cases in a study.
// This enables proper Fleiss' Kappa calculation which requires multiple subjects (cases).
func (s *StatisticsService) CalculateStudyReliabilityMetrics(
	study *domain.Study,
	cases []domain.Case,
	responsesByCase map[uuid.UUID][]domain.CaseResponse,
) (*domain.StudyReliabilityMetrics, error) {
	if len(cases) == 0 {
		return nil, nil
	}

	// Count total responses and unique raters
	var totalResponses int64
	allRaters := make(map[uuid.UUID]bool)
	for _, responses := range responsesByCase {
		totalResponses += int64(len(responses))
		for _, r := range responses {
			allRaters[r.UserID] = true
		}
	}

	// Identify complete raters (who responded to ALL cases)
	completeRaters := s.identifyCompleteRaters(cases, responsesByCase)

	metrics := &domain.StudyReliabilityMetrics{
		StudyID:        study.ID,
		StudyTitle:     study.Title,
		TotalCases:     len(cases),
		TotalResponses: totalResponses,
		UniqueRaters:   int64(len(allRaters)),
		CompleteRaters: int64(len(completeRaters)),
	}

	// Calculate Fleiss' Kappa for each classification system
	// Requires at least 2 complete raters
	if len(completeRaters) >= 2 {
		metrics.DanisWeberFleiss = s.calculateFleissForSystem(cases, responsesByCase, completeRaters, "danis_weber")
		metrics.LaugeHansenFleiss = s.calculateFleissForSystem(cases, responsesByCase, completeRaters, "lauge_hansen")
		metrics.AOOTAFleiss = s.calculateFleissForSystem(cases, responsesByCase, completeRaters, "ao_ota")
		metrics.BartonicekFleiss = s.calculateFleissForSystem(cases, responsesByCase, completeRaters, "bartonicek")
	}

	// Calculate per-case metrics
	metrics.PerCaseMetrics = s.calculatePerCaseMetrics(cases, responsesByCase)

	return metrics, nil
}

// identifyCompleteRaters finds raters who completed ALL cases in the study.
func (s *StatisticsService) identifyCompleteRaters(
	cases []domain.Case,
	responsesByCase map[uuid.UUID][]domain.CaseResponse,
) []uuid.UUID {
	// Track which cases each rater completed
	raterCases := make(map[uuid.UUID]map[uuid.UUID]bool) // userID -> caseID -> completed

	for _, c := range cases {
		responses := responsesByCase[c.ID]
		for _, r := range responses {
			if raterCases[r.UserID] == nil {
				raterCases[r.UserID] = make(map[uuid.UUID]bool)
			}
			raterCases[r.UserID][c.ID] = true
		}
	}

	// Filter to only complete raters
	totalCases := len(cases)
	var completeRaters []uuid.UUID
	for userID, completed := range raterCases {
		if len(completed) >= totalCases {
			completeRaters = append(completeRaters, userID)
		}
	}

	return completeRaters
}

// calculateFleissForSystem builds the Fleiss' Kappa matrix and calculates the statistic.
// Matrix format: matrix[subject][category] = count of raters who assigned that category
func (s *StatisticsService) calculateFleissForSystem(
	cases []domain.Case,
	responsesByCase map[uuid.UUID][]domain.CaseResponse,
	completeRaters []uuid.UUID,
	system string,
) *domain.FleissKappaResult {
	// Create a set of complete rater IDs for quick lookup
	completeRaterSet := make(map[uuid.UUID]bool)
	for _, raterID := range completeRaters {
		completeRaterSet[raterID] = true
	}

	// Collect all unique categories across all cases
	allCategories := make(map[string]bool)
	for _, c := range cases {
		responses := responsesByCase[c.ID]
		for _, r := range responses {
			if !completeRaterSet[r.UserID] {
				continue // Only include complete raters
			}
			cat := s.getClassificationForSystem(r, system)
			if cat != "" {
				allCategories[cat] = true
			}
		}
	}

	if len(allCategories) == 0 {
		return nil
	}

	// Create ordered category list
	var categories []string
	for cat := range allCategories {
		categories = append(categories, cat)
	}

	// Create category index map
	catIndex := make(map[string]int)
	for i, cat := range categories {
		catIndex[cat] = i
	}

	numSubjects := len(cases)
	numCategories := len(categories)
	numRaters := len(completeRaters)

	// Build the matrix: matrix[subject][category] = count
	matrix := make([][]int, numSubjects)
	for i := range matrix {
		matrix[i] = make([]int, numCategories)
	}

	// Fill the matrix
	for subjectIdx, c := range cases {
		responses := responsesByCase[c.ID]
		for _, r := range responses {
			if !completeRaterSet[r.UserID] {
				continue
			}
			cat := s.getClassificationForSystem(r, system)
			if cat != "" {
				if catIdx, ok := catIndex[cat]; ok {
					matrix[subjectIdx][catIdx]++
				}
			}
		}
	}

	// Calculate Fleiss' Kappa
	kappa, err := statistics.FleissKappa(matrix, numRaters)
	if err != nil {
		return nil
	}

	result := domain.NewFleissKappaResult(kappa, numSubjects, numRaters, numCategories)

	// Add confidence interval if we have enough data
	// Using the standard error approximation for Fleiss' Kappa
	if numSubjects >= 2 && numRaters >= 2 {
		ci := statistics.FleissKappaCI(matrix, numRaters, kappa, 0.95)
		result.ConfidenceInterval = ci
	}

	return result
}

// getClassificationForSystem extracts the classification value for a given system from a response.
func (s *StatisticsService) getClassificationForSystem(r domain.CaseResponse, system string) string {
	var val *string
	switch system {
	case "danis_weber":
		val = r.DanisWeberType
	case "lauge_hansen":
		val = r.LaugeHansenType
	case "ao_ota":
		val = r.AOOTACode
	case "bartonicek":
		val = r.BartonicekType
	}
	if val != nil {
		return *val
	}
	return ""
}

// calculatePerCaseMetrics calculates agreement metrics for each case in a study.
func (s *StatisticsService) calculatePerCaseMetrics(
	cases []domain.Case,
	responsesByCase map[uuid.UUID][]domain.CaseResponse,
) []domain.PerCaseMetrics {
	result := make([]domain.PerCaseMetrics, 0, len(cases))

	for _, c := range cases {
		responses := responsesByCase[c.ID]

		cm := domain.PerCaseMetrics{
			CaseOrder:     c.CaseOrder,
			CaseID:        c.ID,
			CaseTitle:     c.Title,
			ResponseCount: len(responses),
		}

		// Calculate agreement for each system
		cm.DanisWeberAgreement = s.calculateCaseAgreement(responses, "danis_weber")
		cm.LaugeHansenAgreement = s.calculateCaseAgreement(responses, "lauge_hansen")
		cm.AOOTAAgreement = s.calculateCaseAgreement(responses, "ao_ota")

		btAgreement := s.calculateCaseAgreement(responses, "bartonicek")
		if btAgreement > 0 {
			cm.BartonicekAgreement = &btAgreement
		}

		// Flag low agreement cases
		cm.IsLowAgreement = cm.DanisWeberAgreement < 60 ||
			cm.LaugeHansenAgreement < 60 ||
			cm.AOOTAAgreement < 60

		result = append(result, cm)
	}

	return result
}

// calculateCaseAgreement calculates percent agreement for a single case and system.
func (s *StatisticsService) calculateCaseAgreement(responses []domain.CaseResponse, system string) float64 {
	var classifications []string
	for _, r := range responses {
		cat := s.getClassificationForSystem(r, system)
		if cat != "" {
			classifications = append(classifications, cat)
		}
	}

	if len(classifications) < 2 {
		return 100.0 // Single response = 100% agreement with itself
	}

	return statistics.PercentAgreement(classifications) * 100
}
