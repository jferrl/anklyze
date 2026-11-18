package service

import (
	"bytes"
	"slices"

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
// It reports no kappa: one case gives each rater a single rating, so kappa could only be 1 or 0.
func (s *StatisticsService) calculateSystemAgreement(responses []domain.CaseResponse, system string) *domain.SystemAgreement {
	classifications := s.classifications(responses, system)
	if len(classifications) == 0 {
		return nil
	}

	return &domain.SystemAgreement{
		System:           system,
		CategoryCounts:   statistics.CategoryCounts(classifications),
		PercentAgreement: percentAgreement(classifications),
	}
}

// classifications returns the non-empty answers in system, one per response.
func (s *StatisticsService) classifications(responses []domain.CaseResponse, system string) []string {
	var out []string
	for _, r := range responses {
		if cat := s.getClassificationForSystem(r, system); cat != "" {
			out = append(out, cat)
		}
	}
	return out
}

// percentAgreement is statistics.PercentAgreement as a percentage, nil with fewer than 2 classifications.
func percentAgreement(classifications []string) *float64 {
	p, ok := statistics.PercentAgreement(classifications)
	if !ok {
		return nil
	}
	p *= 100
	return &p
}

// ============================================================================
// Study Reliability Metrics
// ============================================================================

// CalculateStudyReliabilityMetrics calculates reliability metrics across multiple cases in a study.
// Fleiss' Kappa needs at least 2 complete raters; Cohen's Kappa is added when there are exactly 2.
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

	if len(completeRaters) >= 2 {
		metrics.DanisWeberFleiss = s.calculateFleissForSystem(cases, responsesByCase, completeRaters, "danis_weber")
		metrics.LaugeHansenFleiss = s.calculateFleissForSystem(cases, responsesByCase, completeRaters, "lauge_hansen")
		metrics.AOOTAFleiss = s.calculateFleissForSystem(cases, responsesByCase, completeRaters, "ao_ota")
		metrics.BartonicekFleiss = s.calculateFleissForSystem(cases, responsesByCase, completeRaters, "bartonicek")
	}
	if len(completeRaters) == 2 {
		metrics.DanisWeberCohen = s.calculateCohenForSystem(cases, responsesByCase, completeRaters, "danis_weber")
		metrics.LaugeHansenCohen = s.calculateCohenForSystem(cases, responsesByCase, completeRaters, "lauge_hansen")
		metrics.AOOTACohen = s.calculateCohenForSystem(cases, responsesByCase, completeRaters, "ao_ota")
		metrics.BartonicekCohen = s.calculateCohenForSystem(cases, responsesByCase, completeRaters, "bartonicek")
	}

	// Calculate per-case metrics
	metrics.PerCaseMetrics = s.calculatePerCaseMetrics(cases, responsesByCase)

	return metrics, nil
}

// identifyCompleteRaters finds raters who completed ALL cases in the study, in a stable order.
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
	slices.SortFunc(completeRaters, func(a, b uuid.UUID) int { return bytes.Compare(a[:], b[:]) })

	return completeRaters
}

// completeCaseRatings returns one row per case that every rater answered in system, in the order
// of raters, and how many cases it dropped. Fleiss' Kappa needs equal ratings per case, and
// dropping the case rather than the rater keeps each rater's other answers (see
// docs/RELIABILITY_ANALYSIS.md 4.3). The last response counts if a rater answered a case twice.
func (s *StatisticsService) completeCaseRatings(
	cases []domain.Case,
	responsesByCase map[uuid.UUID][]domain.CaseResponse,
	raters []uuid.UUID,
	system string,
) (rows [][]string, excluded int) {
	for _, c := range cases {
		latest := make(map[uuid.UUID]string, len(raters))
		for _, r := range responsesByCase[c.ID] {
			latest[r.UserID] = s.getClassificationForSystem(r, system)
		}

		row := make([]string, len(raters))
		answered := true
		for i, id := range raters {
			row[i] = latest[id]
			answered = answered && row[i] != ""
		}
		if answered {
			rows = append(rows, row)
		} else {
			excluded++
		}
	}
	return rows, excluded
}

// calculateFleissForSystem builds the Fleiss' Kappa matrix and calculates the statistic.
// Matrix format: matrix[subject][category] = count of raters who assigned that category.
// It returns nil when fewer than 2 cases were answered by every rater.
func (s *StatisticsService) calculateFleissForSystem(
	cases []domain.Case,
	responsesByCase map[uuid.UUID][]domain.CaseResponse,
	completeRaters []uuid.UUID,
	system string,
) *domain.FleissKappaResult {
	rows, excluded := s.completeCaseRatings(cases, responsesByCase, completeRaters, system)
	if len(rows) < 2 {
		return nil
	}

	// Sorted so the matrix, and with it the bootstrap interval, is the same on every run.
	var categories []string
	for _, row := range rows {
		categories = append(categories, row...)
	}
	slices.Sort(categories)
	categories = slices.Compact(categories)

	numRaters := len(completeRaters)
	result := &domain.FleissKappaResult{
		NumSubjects:      len(rows),
		NumRaters:        numRaters,
		NumCategories:    len(categories),
		NumCasesExcluded: excluded,
	}
	// One category makes chance agreement 1 and kappa 0/0: undefined, not perfect.
	if len(categories) == 1 {
		result.KappaUnavailableReason = domain.KappaNoVariation
		return result
	}

	matrix := make([][]int, len(rows))
	for i, row := range rows {
		matrix[i] = make([]int, len(categories))
		for _, cat := range row {
			idx, _ := slices.BinarySearch(categories, cat)
			matrix[i][idx]++
		}
	}

	kappa, err := statistics.FleissKappa(matrix, numRaters)
	if err != nil {
		return nil
	}

	result.Kappa = &kappa
	result.Interpretation = domain.KappaInterpretation(kappa)
	result.ConfidenceInterval = statistics.FleissKappaCI(matrix, numRaters, 0.95)
	return result
}

// calculateCohenForSystem calculates Cohen's Kappa between the two raters across the cases
// both answered in system, plus AO/OTA weighted kappa. It returns nil when fewer than
// 2 cases were answered by both.
func (s *StatisticsService) calculateCohenForSystem(
	cases []domain.Case,
	responsesByCase map[uuid.UUID][]domain.CaseResponse,
	raters []uuid.UUID,
	system string,
) *domain.CohensKappaResult {
	rows, excluded := s.completeCaseRatings(cases, responsesByCase, raters, system)
	if len(rows) < 2 {
		return nil
	}

	pairs := make([][2]string, len(rows))
	for i, row := range rows {
		pairs[i] = [2]string{row[0], row[1]}
	}

	result := &domain.CohensKappaResult{NumSubjects: len(rows), NumCasesExcluded: excluded}
	// As in calculateFleissForSystem: one category leaves kappa undefined, and the weighted kappa too.
	if len(statistics.ExtractCategories(pairs)) == 1 {
		result.KappaUnavailableReason = domain.KappaNoVariation
		return result
	}

	kappa, ci, _ := statistics.CohensKappaWithCI(pairs, 0.95)
	result.Kappa = &kappa
	result.Interpretation = domain.KappaInterpretation(kappa)
	result.ConfidenceInterval = ci
	if system == "ao_ota" {
		result.WeightedKappa = weightedAOOTAKappa(pairs)
	}
	return result
}

// weightedAOOTAKappa is the linear weighted kappa of AO/OTA codes compared by group
// (44-B1.2 counts as 44-B1). Pairs still outside the ordering are excluded and counted;
// it returns nil with fewer than 2 pairs left.
func weightedAOOTAKappa(pairs [][2]string) *domain.WeightedKappaResult {
	grouped := make([][2]string, len(pairs))
	for i, p := range pairs {
		grouped[i] = [2]string{statistics.AOOTAGroup(p[0]), statistics.AOOTAGroup(p[1])}
	}

	weightType := domain.KappaWeightLinear
	kappa, excluded := statistics.WeightedKappa(grouped, statistics.AOOTAOrdering, weightType)
	if len(pairs)-excluded < 2 {
		return nil
	}
	return &domain.WeightedKappaResult{
		Kappa:            kappa,
		Type:             weightType,
		NumPairs:         len(pairs) - excluded,
		NumPairsExcluded: excluded,
	}
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

		cm.DanisWeberAgreement = percentAgreement(s.classifications(responses, "danis_weber"))
		cm.LaugeHansenAgreement = percentAgreement(s.classifications(responses, "lauge_hansen"))
		cm.AOOTAAgreement = percentAgreement(s.classifications(responses, "ao_ota"))
		cm.BartonicekAgreement = percentAgreement(s.classifications(responses, "bartonicek"))

		low := func(p *float64) bool { return p != nil && *p < 60 }
		cm.IsLowAgreement = low(cm.DanisWeberAgreement) || low(cm.LaugeHansenAgreement) || low(cm.AOOTAAgreement)

		result = append(result, cm)
	}

	return result
}
