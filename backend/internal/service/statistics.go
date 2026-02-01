package service

import (
	"math"

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
	n := len(ratings)
	if n < 1 {
		return 0, nil
	}

	// Build contingency table
	categories := s.extractCategories(ratings)
	if len(categories) == 0 {
		return 0, nil
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
		return 1.0, nil // Perfect agreement by definition
	}

	kappa := (po - pe) / (1 - pe)
	return kappa, nil
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
	for j := 0; j < numCategories; j++ {
		sum := 0
		for i := 0; i < numSubjects; i++ {
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
	for i := 0; i < numSubjects; i++ {
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
		var raters []string
		for userID := range uniqueUsers {
			raters = append(raters, userID)
		}
		if len(uniqueUsers[raters[0]]) > 0 && len(uniqueUsers[raters[1]]) > 0 {
			ratings := [][2]string{
				{uniqueUsers[raters[0]][0], uniqueUsers[raters[1]][0]},
			}
			kappa, _ := s.CohensKappa(ratings)
			agreement.CohensKappa = &kappa
		}
	} else if numRaters > 2 {
		// Fleiss' Kappa for multiple raters
		// Build matrix where each row is a subject and columns are categories
		categories := make([]string, 0)
		catIndex := make(map[string]int)
		for cat := range agreement.CategoryCounts {
			catIndex[cat] = len(categories)
			categories = append(categories, cat)
		}

		// For this case, we only have one subject (the study case)
		// So we count how many raters chose each category
		matrix := make([][]int, 1)
		matrix[0] = make([]int, len(categories))
		for _, c := range classifications {
			if idx, ok := catIndex[c]; ok {
				matrix[0][idx]++
			}
		}

		kappa, _ := s.FleissKappa(matrix, numRaters)
		agreement.FleissKappa = &kappa
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
