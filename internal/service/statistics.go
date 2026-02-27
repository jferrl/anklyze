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

// CohensKappa calculates Cohen's Kappa for two raters.
// ratings is a slice of [rater1_category, rater2_category] pairs.
// Returns the Kappa value between -1 and 1, where:
//   - 1 = perfect agreement
//   - 0 = agreement expected by chance
//   - < 0 = less than chance agreement
func (s *StatisticsService) CohensKappa(ratings [][2]string) (float64, error) {
	return statistics.CohensKappa(ratings)
}

// CohensKappaWithCI calculates Cohen's Kappa with confidence interval.
// ratings is a slice of [rater1_category, rater2_category] pairs.
// confidenceLevel is typically 0.95 for 95% CI.
// Returns the Kappa value, confidence interval, and any error.
func (s *StatisticsService) CohensKappaWithCI(ratings [][2]string, confidenceLevel float64) (float64, *domain.ConfidenceInterval, error) {
	return statistics.CohensKappaWithCI(ratings, confidenceLevel)
}

// WeightedKappa calculates weighted Cohen's Kappa for ordinal categories.
// The ordering parameter defines the order of categories (e.g., ["44-A1", "44-A2", "44-B1"...]).
// weightType can be "linear" or "quadratic".
func (s *StatisticsService) WeightedKappa(ratings [][2]string, ordering []string, weightType domain.KappaWeightType) (float64, error) {
	return statistics.WeightedKappa(ratings, ordering, weightType)
}

// FleissKappa calculates Fleiss' Kappa for multiple raters.
// matrix[i][j] = number of raters who assigned subject i to category j
// numRaters is the number of raters per subject (must be consistent).
func (s *StatisticsService) FleissKappa(matrix [][]int, numRaters int) (float64, error) {
	return statistics.FleissKappa(matrix, numRaters)
}

// PercentAgreement calculates simple percentage agreement among all raters.
// ratings is a slice of categories assigned by different raters to the same subject.
func (s *StatisticsService) PercentAgreement(ratings []string) float64 {
	return statistics.PercentAgreement(ratings)
}

// ConfusionMatrix builds a confusion matrix comparing observed to expected classifications.
// Returns map[expected][observed] = count
func (s *StatisticsService) ConfusionMatrix(observed, expected []string) map[string]map[string]int64 {
	return statistics.ConfusionMatrix(observed, expected)
}

// CategoryCounts counts occurrences of each category.
func (s *StatisticsService) CategoryCounts(ratings []string) map[string]int64 {
	return statistics.CategoryCounts(ratings)
}

// CalculateCategoryMetrics calculates diagnostic metrics (sensitivity, specificity, etc.)
// for each category by comparing observed classifications against expected (gold standard).
// Returns a map of category -> metrics.
func (s *StatisticsService) CalculateCategoryMetrics(observed, expected []string) map[string]*domain.CategoryMetrics {
	return statistics.CalculateCategoryMetrics(observed, expected)
}

// CalculateAccuracy calculates the accuracy (percentage correct) of predictions.
func (s *StatisticsService) CalculateAccuracy(observed, expected []string) float64 {
	return statistics.CalculateAccuracy(observed, expected)
}

// Round rounds a float to the specified number of decimal places.
func (s *StatisticsService) Round(val float64, precision int) float64 {
	return statistics.Round(val, precision)
}

// CalculateReliabilityMetrics calculates all reliability metrics for a case.
func (s *StatisticsService) CalculateReliabilityMetrics(
	responses []domain.CaseResponse,
	cs *domain.Case,
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
		CaseID:         cs.ID,
		TotalResponses: int64(len(responses)),
		UniqueRaters:   int64(len(uniqueRaters)),
	}

	// Calculate per-system agreement
	metrics.DanisWeberAgreement = s.calculateSystemAgreement(responses, "danis_weber")
	metrics.LaugeHansenAgreement = s.calculateSystemAgreement(responses, "lauge_hansen")
	metrics.AOOTAAgreement = s.calculateSystemAgreement(responses, "ao_ota")
	metrics.BartonicekAgreement = s.calculateSystemAgreement(responses, "bartonicek")

	// Calculate gold standard accuracy if reference is set
	if cs.HasReferenceClassification() {
		refClass, err := cs.GetReferenceClassification()
		if err == nil && refClass != nil {
			metrics.GoldStandardAccuracy = s.calculateGoldStandardAccuracy(responses, refClass)
		}
	}

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

// calculateGoldStandardAccuracy calculates accuracy comparing responses to reference.
func (s *StatisticsService) calculateGoldStandardAccuracy(
	responses []domain.CaseResponse,
	reference *domain.ClassificationResult,
) *domain.GoldStandardAccuracy {
	accuracy := &domain.GoldStandardAccuracy{
		TotalComparisons: int64(len(responses)),
	}

	var dwCorrect, lhCorrect, aoCorrect, btCorrect int64
	var dwTotal, lhTotal, aoTotal, btTotal int64

	for _, r := range responses {
		// Danis-Weber
		if r.DanisWeberType != nil && reference.DanisWeber != nil {
			dwTotal++
			if *r.DanisWeberType == string(reference.DanisWeber.Type) {
				dwCorrect++
			}
		}

		// Lauge-Hansen
		if r.LaugeHansenType != nil && reference.LaugeHansen != nil {
			lhTotal++
			if *r.LaugeHansenType == string(reference.LaugeHansen.Type) {
				lhCorrect++
			}
		}

		// AO/OTA
		if r.AOOTACode != nil && reference.AOOTA != nil {
			aoTotal++
			if *r.AOOTACode == string(reference.AOOTA.Code) {
				aoCorrect++
			}
		}

		// Bartonicek
		if r.BartonicekType != nil && reference.Bartonicek != nil {
			btTotal++
			if *r.BartonicekType == string(reference.Bartonicek.Type) {
				btCorrect++
			}
		}
	}

	// Calculate per-system accuracy
	if dwTotal > 0 {
		acc := float64(dwCorrect) / float64(dwTotal) * 100
		accuracy.DanisWeberAccuracy = &acc
		accuracy.CorrectResponses += dwCorrect
	}
	if lhTotal > 0 {
		acc := float64(lhCorrect) / float64(lhTotal) * 100
		accuracy.LaugeHansenAccuracy = &acc
		accuracy.CorrectResponses += lhCorrect
	}
	if aoTotal > 0 {
		acc := float64(aoCorrect) / float64(aoTotal) * 100
		accuracy.AOOTAAccuracy = &acc
		accuracy.CorrectResponses += aoCorrect
	}
	if btTotal > 0 {
		acc := float64(btCorrect) / float64(btTotal) * 100
		accuracy.BartonicekAccuracy = &acc
		accuracy.CorrectResponses += btCorrect
	}

	// Calculate overall accuracy
	totalCorrect := dwCorrect + lhCorrect + aoCorrect + btCorrect
	totalComparisons := dwTotal + lhTotal + aoTotal + btTotal
	if totalComparisons > 0 {
		accuracy.OverallAccuracy = float64(totalCorrect) / float64(totalComparisons) * 100
		accuracy.IncorrectResponses = totalComparisons - totalCorrect
	}

	// Calculate per-category metrics (sensitivity, specificity, etc.)
	// Combine all classification systems for aggregate metrics
	var allObserved, allExpected []string
	for _, r := range responses {
		if r.DanisWeberType != nil && reference.DanisWeber != nil {
			allObserved = append(allObserved, *r.DanisWeberType)
			allExpected = append(allExpected, string(reference.DanisWeber.Type))
		}
		if r.LaugeHansenType != nil && reference.LaugeHansen != nil {
			allObserved = append(allObserved, *r.LaugeHansenType)
			allExpected = append(allExpected, string(reference.LaugeHansen.Type))
		}
		if r.AOOTACode != nil && reference.AOOTA != nil {
			allObserved = append(allObserved, *r.AOOTACode)
			allExpected = append(allExpected, string(reference.AOOTA.Code))
		}
		if r.BartonicekType != nil && reference.Bartonicek != nil {
			allObserved = append(allObserved, *r.BartonicekType)
			allExpected = append(allExpected, string(reference.Bartonicek.Type))
		}
	}

	if len(allObserved) > 0 {
		accuracy.PerCategoryMetrics = statistics.CalculateCategoryMetrics(allObserved, allExpected)
	}

	return accuracy
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

	// Calculate aggregated gold standard accuracy
	metrics.GoldStandardAccuracy = s.calculateStudyGoldStandardAccuracy(cases, responsesByCase)

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

		// Calculate gold standard match rate if reference is set
		if c.HasReferenceClassification() {
			refClass, err := c.GetReferenceClassification()
			if err == nil && refClass != nil {
				matchRate := s.calculateGoldStandardMatchRate(responses, refClass)
				cm.GoldStandardMatchRate = &matchRate
			}
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

// calculateGoldStandardMatchRate calculates the percentage of responses matching the gold standard.
func (s *StatisticsService) calculateGoldStandardMatchRate(
	responses []domain.CaseResponse,
	reference *domain.ClassificationResult,
) float64 {
	if len(responses) == 0 || reference == nil {
		return 0
	}

	var matches, total int

	for _, r := range responses {
		// Check each available system
		comparisons := 0
		matchCount := 0

		if r.DanisWeberType != nil && reference.DanisWeber != nil {
			comparisons++
			if *r.DanisWeberType == string(reference.DanisWeber.Type) {
				matchCount++
			}
		}
		if r.LaugeHansenType != nil && reference.LaugeHansen != nil {
			comparisons++
			if *r.LaugeHansenType == string(reference.LaugeHansen.Type) {
				matchCount++
			}
		}
		if r.AOOTACode != nil && reference.AOOTA != nil {
			comparisons++
			if *r.AOOTACode == string(reference.AOOTA.Code) {
				matchCount++
			}
		}
		if r.BartonicekType != nil && reference.Bartonicek != nil {
			comparisons++
			if *r.BartonicekType == string(reference.Bartonicek.Type) {
				matchCount++
			}
		}

		if comparisons > 0 {
			total += comparisons
			matches += matchCount
		}
	}

	if total == 0 {
		return 0
	}

	return float64(matches) / float64(total) * 100
}

// calculateStudyGoldStandardAccuracy calculates aggregated gold standard accuracy across all cases.
func (s *StatisticsService) calculateStudyGoldStandardAccuracy(
	cases []domain.Case,
	responsesByCase map[uuid.UUID][]domain.CaseResponse,
) *domain.StudyGoldStandardAccuracy {
	var totalDW, correctDW int64
	var totalLH, correctLH int64
	var totalAO, correctAO int64
	var totalBT, correctBT int64
	casesWithRef := 0

	for _, c := range cases {
		if !c.HasReferenceClassification() {
			continue
		}

		refClass, err := c.GetReferenceClassification()
		if err != nil || refClass == nil {
			continue
		}

		casesWithRef++
		responses := responsesByCase[c.ID]

		for _, r := range responses {
			if r.DanisWeberType != nil && refClass.DanisWeber != nil {
				totalDW++
				if *r.DanisWeberType == string(refClass.DanisWeber.Type) {
					correctDW++
				}
			}
			if r.LaugeHansenType != nil && refClass.LaugeHansen != nil {
				totalLH++
				if *r.LaugeHansenType == string(refClass.LaugeHansen.Type) {
					correctLH++
				}
			}
			if r.AOOTACode != nil && refClass.AOOTA != nil {
				totalAO++
				if *r.AOOTACode == string(refClass.AOOTA.Code) {
					correctAO++
				}
			}
			if r.BartonicekType != nil && refClass.Bartonicek != nil {
				totalBT++
				if *r.BartonicekType == string(refClass.Bartonicek.Type) {
					correctBT++
				}
			}
		}
	}

	if casesWithRef == 0 {
		return nil
	}

	totalComparisons := totalDW + totalLH + totalAO + totalBT
	totalCorrect := correctDW + correctLH + correctAO + correctBT

	if totalComparisons == 0 {
		return nil
	}

	accuracy := &domain.StudyGoldStandardAccuracy{
		CasesWithReference: casesWithRef,
		TotalComparisons:   totalComparisons,
		OverallAccuracy:    float64(totalCorrect) / float64(totalComparisons) * 100,
	}

	if totalDW > 0 {
		acc := float64(correctDW) / float64(totalDW) * 100
		accuracy.DanisWeberAccuracy = &acc
	}
	if totalLH > 0 {
		acc := float64(correctLH) / float64(totalLH) * 100
		accuracy.LaugeHansenAccuracy = &acc
	}
	if totalAO > 0 {
		acc := float64(correctAO) / float64(totalAO) * 100
		accuracy.AOOTAAccuracy = &acc
	}
	if totalBT > 0 {
		acc := float64(correctBT) / float64(totalBT) * 100
		accuracy.BartonicekAccuracy = &acc
	}

	return accuracy
}
