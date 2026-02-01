package service

import (
	"math"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
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
	kappa, _, err := s.CohensKappaWithCI(ratings, 0.95)
	return kappa, err
}

// CohensKappaWithCI calculates Cohen's Kappa with confidence interval.
// ratings is a slice of [rater1_category, rater2_category] pairs.
// confidenceLevel is typically 0.95 for 95% CI.
// Returns the Kappa value, confidence interval, and any error.
func (s *StatisticsService) CohensKappaWithCI(ratings [][2]string, confidenceLevel float64) (float64, *domain.ConfidenceInterval, error) {
	n := len(ratings)
	if n < 1 {
		return 0, nil, nil
	}

	// Build contingency table
	categories := s.extractCategories(ratings)
	if len(categories) == 0 {
		return 0, nil, nil
	}

	// Count agreements and category frequencies
	observed := 0
	rater1Counts := make(map[string]int)
	rater2Counts := make(map[string]int)

	for _, pair := range ratings {
		if pair[0] == pair[1] {
			observed++
		}
		rater1Counts[pair[0]]++
		rater2Counts[pair[1]]++
	}

	// Calculate observed agreement (P_o)
	po := float64(observed) / float64(n)

	// Calculate expected agreement by chance (P_e)
	pe := 0.0
	for _, cat := range categories {
		p1 := float64(rater1Counts[cat]) / float64(n)
		p2 := float64(rater2Counts[cat]) / float64(n)
		pe += p1 * p2
	}

	// Cohen's Kappa formula: K = (P_o - P_e) / (1 - P_e)
	if pe == 1 {
		return 1.0, nil, nil // Perfect agreement by definition
	}

	kappa := (po - pe) / (1 - pe)

	// Calculate confidence interval
	// Standard error formula (approximate): SE = sqrt((Po * (1 - Po)) / (n * (1 - Pe)^2))
	// This is a simplified approximation; more complex formulas exist for small samples
	var ci *domain.ConfidenceInterval
	if n >= 2 {
		denominator := float64(n) * math.Pow(1-pe, 2)
		if denominator > 0 {
			se := math.Sqrt((po * (1 - po)) / denominator)

			// Z-score for confidence level (default 95% -> z = 1.96)
			z := 1.96 // 95% CI
			switch confidenceLevel {
			case 0.99:
				z = 2.576
			case 0.90:
				z = 1.645
			}

			lower := kappa - z*se
			upper := kappa + z*se

			// Clamp to valid Kappa range [-1, 1]
			if lower < -1 {
				lower = -1
			}
			if upper > 1 {
				upper = 1
			}

			ci = &domain.ConfidenceInterval{
				Lower: Round(lower, 4),
				Upper: Round(upper, 4),
				Level: confidenceLevel,
			}
		}
	}

	return kappa, ci, nil
}

// WeightedKappa calculates weighted Cohen's Kappa for ordinal categories.
// The ordering parameter defines the order of categories (e.g., ["44-A1", "44-A2", "44-B1"...]).
// weightType can be "linear" or "quadratic".
// Linear: w_ij = 1 - |i-j|/(k-1)
// Quadratic: w_ij = 1 - (i-j)²/(k-1)²
func (s *StatisticsService) WeightedKappa(ratings [][2]string, ordering []string, weightType domain.KappaWeightType) (float64, error) {
	n := len(ratings)
	if n < 1 || len(ordering) < 2 {
		return 0, nil
	}

	// Create index map for ordering
	orderIndex := make(map[string]int)
	for i, cat := range ordering {
		orderIndex[cat] = i
	}

	k := len(ordering)
	kMinus1 := float64(k - 1)

	// Build weight matrix
	weights := make([][]float64, k)
	for i := range k {
		weights[i] = make([]float64, k)
		for j := range k {
			diff := math.Abs(float64(i - j))
			switch weightType {
			case domain.KappaWeightQuadratic:
				weights[i][j] = 1 - (diff*diff)/(kMinus1*kMinus1)
			default: // Linear
				weights[i][j] = 1 - diff/kMinus1
			}
		}
	}

	// Build observed frequency matrix (contingency table)
	observed := make([][]float64, k)
	for i := range k {
		observed[i] = make([]float64, k)
	}

	rater1Counts := make([]float64, k)
	rater2Counts := make([]float64, k)

	validPairs := 0
	for _, pair := range ratings {
		i, ok1 := orderIndex[pair[0]]
		j, ok2 := orderIndex[pair[1]]
		if ok1 && ok2 {
			observed[i][j]++
			rater1Counts[i]++
			rater2Counts[j]++
			validPairs++
		}
	}

	if validPairs == 0 {
		return 0, nil
	}

	nFloat := float64(validPairs)

	// Calculate observed weighted agreement (P_o)
	po := 0.0
	for i := 0; i < k; i++ {
		for j := 0; j < k; j++ {
			po += weights[i][j] * observed[i][j] / nFloat
		}
	}

	// Calculate expected weighted agreement (P_e)
	pe := 0.0
	for i := 0; i < k; i++ {
		for j := 0; j < k; j++ {
			pe += weights[i][j] * (rater1Counts[i] / nFloat) * (rater2Counts[j] / nFloat)
		}
	}

	// Weighted Kappa formula: K_w = (P_o - P_e) / (1 - P_e)
	if pe >= 1 {
		return 1.0, nil
	}

	kappa := (po - pe) / (1 - pe)
	return kappa, nil
}

// aoOTAOrdering defines the natural order of AO/OTA classifications.
var aoOTAOrdering = []string{
	"44-A1", "44-A2",
	"44-B1", "44-B2", "44-B3",
	"44-C1", "44-C2", "44-C3",
}

// FleissKappa calculates Fleiss' Kappa for multiple raters.
// matrix[i][j] = number of raters who assigned subject i to category j
// numRaters is the number of raters per subject (must be consistent).
// Returns the Kappa value.
func (s *StatisticsService) FleissKappa(matrix [][]int, numRaters int) (float64, error) {
	if len(matrix) == 0 || numRaters < 2 {
		return 0, nil
	}

	numSubjects := len(matrix)
	numCategories := len(matrix[0])
	n := float64(numRaters)
	N := float64(numSubjects)

	// Calculate P_j (proportion of all assignments to category j)
	pj := make([]float64, numCategories)
	totalAssignments := N * n
	for j := range numCategories {
		sum := 0
		for i := range numSubjects {
			if j < len(matrix[i]) {
				sum += matrix[i][j]
			}
		}
		pj[j] = float64(sum) / totalAssignments
	}

	// Calculate P_i (agreement for each subject)
	Pi := make([]float64, numSubjects)
	for i := 0; i < numSubjects; i++ {
		sum := 0.0
		for j := 0; j < numCategories; j++ {
			if j < len(matrix[i]) {
				nij := float64(matrix[i][j])
				sum += nij * (nij - 1)
			}
		}
		if n*(n-1) > 0 {
			Pi[i] = sum / (n * (n - 1))
		}
	}

	// Calculate P_bar (mean of P_i values)
	Pbar := 0.0
	for i := range numSubjects {
		Pbar += Pi[i]
	}
	Pbar /= N

	// Calculate P_e_bar (expected agreement by chance)
	PeBar := 0.0
	for j := 0; j < numCategories; j++ {
		PeBar += pj[j] * pj[j]
	}

	// Fleiss' Kappa formula: K = (P_bar - P_e_bar) / (1 - P_e_bar)
	if PeBar == 1 {
		return 1.0, nil
	}

	kappa := (Pbar - PeBar) / (1 - PeBar)
	return kappa, nil
}

// PercentAgreement calculates simple percentage agreement among all raters.
// ratings is a slice of categories assigned by different raters to the same subject.
func (s *StatisticsService) PercentAgreement(ratings []string) float64 {
	if len(ratings) < 2 {
		return 1.0
	}

	// Find most common rating
	counts := make(map[string]int)
	for _, r := range ratings {
		counts[r]++
	}

	maxCount := 0
	for _, c := range counts {
		if c > maxCount {
			maxCount = c
		}
	}

	return float64(maxCount) / float64(len(ratings))
}

// ConfusionMatrix builds a confusion matrix comparing observed to expected classifications.
// Returns map[expected][observed] = count
func (s *StatisticsService) ConfusionMatrix(observed, expected []string) map[string]map[string]int64 {
	matrix := make(map[string]map[string]int64)

	for i := 0; i < len(observed) && i < len(expected); i++ {
		exp := expected[i]
		obs := observed[i]

		if matrix[exp] == nil {
			matrix[exp] = make(map[string]int64)
		}
		matrix[exp][obs]++
	}

	return matrix
}

// CategoryCounts counts occurrences of each category.
func (s *StatisticsService) CategoryCounts(ratings []string) map[string]int64 {
	counts := make(map[string]int64)
	for _, r := range ratings {
		if r != "" {
			counts[r]++
		}
	}
	return counts
}

// CalculateCategoryMetrics calculates diagnostic metrics (sensitivity, specificity, etc.)
// for each category by comparing observed classifications against expected (gold standard).
// Returns a map of category -> metrics.
func (s *StatisticsService) CalculateCategoryMetrics(observed, expected []string) map[string]*domain.CategoryMetrics {
	if len(observed) == 0 || len(expected) == 0 {
		return nil
	}

	// Find all unique categories
	categories := make(map[string]bool)
	for _, cat := range observed {
		if cat != "" {
			categories[cat] = true
		}
	}
	for _, cat := range expected {
		if cat != "" {
			categories[cat] = true
		}
	}

	if len(categories) == 0 {
		return nil
	}

	n := len(observed)
	if len(expected) < n {
		n = len(expected)
	}

	result := make(map[string]*domain.CategoryMetrics)

	for cat := range categories {
		// Calculate confusion matrix elements for this category (binary: cat vs not-cat)
		var tp, tn, fp, fn int64

		for i := range n {
			actualPositive := expected[i] == cat
			predictedPositive := observed[i] == cat

			switch {
			case actualPositive && predictedPositive:
				tp++ // True Positive
			case !actualPositive && !predictedPositive:
				tn++ // True Negative
			case !actualPositive && predictedPositive:
				fp++ // False Positive
			case actualPositive && !predictedPositive:
				fn++ // False Negative
			}
		}

		metrics := &domain.CategoryMetrics{
			Category: cat,
		}

		// Sensitivity (True Positive Rate): TP / (TP + FN)
		if tp+fn > 0 {
			metrics.Sensitivity = float64(tp) / float64(tp+fn)
		}

		// Specificity (True Negative Rate): TN / (TN + FP)
		if tn+fp > 0 {
			metrics.Specificity = float64(tn) / float64(tn+fp)
		}

		// Positive Predictive Value (Precision): TP / (TP + FP)
		if tp+fp > 0 {
			metrics.PPV = float64(tp) / float64(tp+fp)
		}

		// Negative Predictive Value: TN / (TN + FN)
		if tn+fn > 0 {
			metrics.NPV = float64(tn) / float64(tn+fn)
		}

		// F1 Score: 2 * (PPV * Sensitivity) / (PPV + Sensitivity)
		if metrics.PPV+metrics.Sensitivity > 0 {
			metrics.F1Score = 2 * (metrics.PPV * metrics.Sensitivity) / (metrics.PPV + metrics.Sensitivity)
		}

		// Round to 4 decimal places
		metrics.Sensitivity = Round(metrics.Sensitivity, 4)
		metrics.Specificity = Round(metrics.Specificity, 4)
		metrics.PPV = Round(metrics.PPV, 4)
		metrics.NPV = Round(metrics.NPV, 4)
		metrics.F1Score = Round(metrics.F1Score, 4)

		result[cat] = metrics
	}

	return result
}

// CalculateAccuracy calculates the accuracy (percentage correct) of predictions.
func (s *StatisticsService) CalculateAccuracy(observed, expected []string) float64 {
	if len(observed) == 0 || len(expected) == 0 {
		return 0
	}

	correct := 0
	total := 0
	for i := 0; i < len(observed) && i < len(expected); i++ {
		total++
		if observed[i] == expected[i] {
			correct++
		}
	}

	if total == 0 {
		return 0
	}
	return float64(correct) / float64(total) * 100
}

// CalculateReliabilityMetrics calculates all reliability metrics for a study.
func (s *StatisticsService) CalculateReliabilityMetrics(
	responses []domain.StudyResponse,
	study *domain.Study,
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
		StudyID:        study.ID,
		TotalResponses: int64(len(responses)),
		UniqueRaters:   int64(len(uniqueRaters)),
	}

	// Calculate per-system agreement
	metrics.DanisWeberAgreement = s.calculateSystemAgreement(responses, "danis_weber")
	metrics.LaugeHansenAgreement = s.calculateSystemAgreement(responses, "lauge_hansen")
	metrics.AOOTAAgreement = s.calculateSystemAgreement(responses, "ao_ota")
	metrics.BartonicekAgreement = s.calculateSystemAgreement(responses, "bartonicek")

	// Calculate gold standard accuracy if reference is set
	if study.HasReferenceClassification() {
		refClass, err := study.GetReferenceClassification()
		if err == nil && refClass != nil {
			metrics.GoldStandardAccuracy = s.calculateGoldStandardAccuracy(responses, refClass)
		}
	}

	return metrics, nil
}

// calculateSystemAgreement calculates agreement metrics for a single classification system.
func (s *StatisticsService) calculateSystemAgreement(responses []domain.StudyResponse, system string) *domain.SystemAgreement {
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
		CategoryCounts: s.CategoryCounts(classifications),
	}

	// Calculate percent agreement (mode frequency / total)
	if len(classifications) > 1 {
		agreement.PercentAgreement = s.PercentAgreement(classifications) * 100
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
			kappa, ci, _ := s.CohensKappaWithCI(ratings, 0.95)
			agreement.CohensKappa = &kappa
			agreement.CohensKappaCI = ci

			// For AO/OTA, also calculate weighted Kappa (ordinal categories)
			if system == "ao_ota" {
				weightType := domain.KappaWeightLinear
				weightedKappa, _ := s.WeightedKappa(ratings, aoOTAOrdering, weightType)
				agreement.WeightedKappa = &weightedKappa
				agreement.WeightedKappaType = &weightType
			}
		}
	} else if numRaters > 2 {
		// Fleiss' Kappa for multiple raters
		// NOTE: Fleiss' Kappa requires multiple subjects (cases) to be meaningful.
		// Current study design has a single case, so we cannot properly calculate
		// inter-rater reliability using Fleiss' Kappa.
		//
		// The formula requires a matrix where:
		// - Each ROW = one subject (case/patient)
		// - Each COLUMN = one category
		// - Each cell = count of raters choosing that category for that subject
		//
		// With only 1 subject, we can only calculate within-case agreement,
		// not across-case reliability. Return nil with explanatory note.
		note := "Fleiss' Kappa requires multiple cases (subjects) to calculate inter-rater reliability. " +
			"Current study design has a single case. Consider creating a study cohort with multiple cases " +
			"for proper reliability assessment."
		agreement.FleissKappaNote = &note
		// FleissKappa remains nil
	}

	return agreement
}

// calculateGoldStandardAccuracy calculates accuracy comparing responses to reference.
func (s *StatisticsService) calculateGoldStandardAccuracy(
	responses []domain.StudyResponse,
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
		accuracy.PerCategoryMetrics = s.CalculateCategoryMetrics(allObserved, allExpected)
	}

	return accuracy
}

// extractCategories extracts unique categories from rating pairs.
func (s *StatisticsService) extractCategories(ratings [][2]string) []string {
	seen := make(map[string]bool)
	var categories []string
	for _, pair := range ratings {
		if pair[0] != "" && !seen[pair[0]] {
			seen[pair[0]] = true
			categories = append(categories, pair[0])
		}
		if pair[1] != "" && !seen[pair[1]] {
			seen[pair[1]] = true
			categories = append(categories, pair[1])
		}
	}
	return categories
}

// Round rounds a float to the specified number of decimal places.
func Round(val float64, precision int) float64 {
	ratio := math.Pow(10, float64(precision))
	return math.Round(val*ratio) / ratio
}

// ============================================================================
// Cohort Reliability Metrics
// ============================================================================

// CalculateCohortReliabilityMetrics calculates reliability metrics across multiple cases in a cohort.
// This enables proper Fleiss' Kappa calculation which requires multiple subjects (cases).
func (s *StatisticsService) CalculateCohortReliabilityMetrics(
	cohort *domain.StudyCohort,
	cases []domain.Study,
	responsesByCase map[uuid.UUID][]domain.StudyResponse,
) (*domain.CohortReliabilityMetrics, error) {
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

	metrics := &domain.CohortReliabilityMetrics{
		CohortID:       cohort.ID,
		CohortTitle:    cohort.Title,
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
	metrics.GoldStandardAccuracy = s.calculateCohortGoldStandardAccuracy(cases, responsesByCase)

	return metrics, nil
}

// identifyCompleteRaters finds raters who completed ALL cases in the cohort.
func (s *StatisticsService) identifyCompleteRaters(
	cases []domain.Study,
	responsesByCase map[uuid.UUID][]domain.StudyResponse,
) []uuid.UUID {
	// Track which cases each rater completed
	raterCases := make(map[uuid.UUID]map[uuid.UUID]bool) // userID -> studyID -> completed

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
	cases []domain.Study,
	responsesByCase map[uuid.UUID][]domain.StudyResponse,
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
	kappa, err := s.FleissKappa(matrix, numRaters)
	if err != nil {
		return nil
	}

	result := domain.NewFleissKappaResult(kappa, numSubjects, numRaters, numCategories)

	// Add confidence interval if we have enough data
	// Using the standard error approximation for Fleiss' Kappa
	if numSubjects >= 2 && numRaters >= 2 {
		ci := s.calculateFleissKappaCI(matrix, numRaters, kappa, 0.95)
		result.ConfidenceInterval = ci
	}

	return result
}

// calculateFleissKappaCI calculates confidence interval for Fleiss' Kappa.
// Uses the approximate variance formula.
func (s *StatisticsService) calculateFleissKappaCI(matrix [][]int, numRaters int, kappa float64, confidenceLevel float64) *domain.ConfidenceInterval {
	// Simplified approximation for Fleiss' Kappa variance
	// Based on Fleiss (1971) and later refinements
	n := float64(len(matrix))      // Number of subjects
	k := float64(numRaters)        // Number of raters

	if n < 2 || k < 2 {
		return nil
	}

	// Calculate P_e (expected agreement)
	numCategories := len(matrix[0])
	pj := make([]float64, numCategories)
	totalAssignments := n * k

	for j := 0; j < numCategories; j++ {
		sum := 0
		for i := 0; i < int(n); i++ {
			if j < len(matrix[i]) {
				sum += matrix[i][j]
			}
		}
		pj[j] = float64(sum) / totalAssignments
	}

	pe := 0.0
	for j := 0; j < numCategories; j++ {
		pe += pj[j] * pj[j]
	}

	// Approximate standard error (simplified formula)
	// SE ≈ sqrt(2 / (n * k * (k-1) * (1-Pe)^2))
	denominator := n * k * (k - 1) * math.Pow(1-pe, 2)
	if denominator <= 0 {
		return nil
	}

	se := math.Sqrt(2 / denominator)

	// Z-score for confidence level
	z := 1.96 // 95% CI
	switch confidenceLevel {
	case 0.99:
		z = 2.576
	case 0.90:
		z = 1.645
	}

	lower := kappa - z*se
	upper := kappa + z*se

	// Clamp to valid range
	if lower < -1 {
		lower = -1
	}
	if upper > 1 {
		upper = 1
	}

	return &domain.ConfidenceInterval{
		Lower: Round(lower, 4),
		Upper: Round(upper, 4),
		Level: confidenceLevel,
	}
}

// getClassificationForSystem extracts the classification value for a given system from a response.
func (s *StatisticsService) getClassificationForSystem(r domain.StudyResponse, system string) string {
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

// calculatePerCaseMetrics calculates agreement metrics for each case in a cohort.
func (s *StatisticsService) calculatePerCaseMetrics(
	cases []domain.Study,
	responsesByCase map[uuid.UUID][]domain.StudyResponse,
) []domain.CaseMetrics {
	result := make([]domain.CaseMetrics, 0, len(cases))

	for _, c := range cases {
		responses := responsesByCase[c.ID]

		cm := domain.CaseMetrics{
			CaseOrder:     c.CaseOrder,
			StudyID:       c.ID,
			StudyTitle:    c.Title,
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
func (s *StatisticsService) calculateCaseAgreement(responses []domain.StudyResponse, system string) float64 {
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

	return s.PercentAgreement(classifications) * 100
}

// calculateGoldStandardMatchRate calculates the percentage of responses matching the gold standard.
func (s *StatisticsService) calculateGoldStandardMatchRate(
	responses []domain.StudyResponse,
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

// calculateCohortGoldStandardAccuracy calculates aggregated gold standard accuracy across all cases.
func (s *StatisticsService) calculateCohortGoldStandardAccuracy(
	cases []domain.Study,
	responsesByCase map[uuid.UUID][]domain.StudyResponse,
) *domain.CohortGoldStandardAccuracy {
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

	accuracy := &domain.CohortGoldStandardAccuracy{
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
