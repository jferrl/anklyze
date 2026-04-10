package service

import (
	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/statistics"
)

// accuracyScore tracks correct/total counts for per-rater accuracy calculation.
type accuracyScore struct {
	correct int
	total   int
}

// CalculateGoldStandardAccuracy calculates accuracy metrics for a single case
// by comparing rater responses against the gold standard.
func (s *StatisticsService) CalculateGoldStandardAccuracy(
	cs *domain.Case,
	responses []domain.CaseResponse,
) (*domain.GoldStandardAccuracy, error) {
	gold, err := cs.GetGoldStandard()
	if err != nil {
		return nil, err
	}

	result := &domain.GoldStandardAccuracy{
		CaseID:       cs.ID,
		HasGold:      gold != nil,
		TotalRaters:  len(responses),
		GoldStandard: gold,
	}

	if gold == nil || len(responses) == 0 {
		return result, nil
	}

	// Calculate per-system accuracy
	if gold.DanisWeber != nil {
		result.DanisWeberAccuracy = s.calculateSystemAccuracy(
			responses, "danis_weber", string(gold.DanisWeber.Type),
		)
	}
	if gold.LaugeHansen != nil {
		result.LaugeHansenAccuracy = s.calculateSystemAccuracy(
			responses, "lauge_hansen", string(gold.LaugeHansen.Type),
		)
	}
	if gold.AOOTA != nil {
		result.AOOTAAccuracy = s.calculateSystemAccuracy(
			responses, "ao_ota", string(gold.AOOTA.Code),
		)
	}
	if gold.Bartonicek != nil {
		result.BartonicekAccuracy = s.calculateSystemAccuracy(
			responses, "bartonicek", string(gold.Bartonicek.Type),
		)
	}

	return result, nil
}

// calculateSystemAccuracy calculates accuracy for a single classification system.
func (s *StatisticsService) calculateSystemAccuracy(
	responses []domain.CaseResponse,
	system string,
	goldValue string,
) *domain.SystemAccuracy {
	var ratings []string
	for _, r := range responses {
		cat := s.getClassificationForSystem(r, system)
		if cat != "" {
			ratings = append(ratings, cat)
		}
	}

	if len(ratings) == 0 {
		return nil
	}

	accuracy, correct := statistics.GoldStandardAccuracy(ratings, goldValue)
	majorityValue, majorityCount := statistics.MajorityVote(ratings)
	distribution := statistics.CategoryCounts(ratings)

	return &domain.SystemAccuracy{
		System:               system,
		GoldValue:            goldValue,
		Accuracy:             accuracy,
		TotalRaters:          len(ratings),
		CorrectRaters:        correct,
		MajorityValue:        majorityValue,
		MajorityMatchesGold:  majorityValue == goldValue,
		MajorityPercentage:   float64(majorityCount) / float64(len(ratings)) * 100,
		ResponseDistribution: distribution,
	}
}

// CalculateStudyGoldStandardMetrics calculates gold standard accuracy across a study.
func (s *StatisticsService) CalculateStudyGoldStandardMetrics(
	study *domain.Study,
	cases []domain.Case,
	responsesByCase map[uuid.UUID][]domain.CaseResponse,
) (*domain.StudyGoldStandardMetrics, error) {
	if len(cases) == 0 {
		return nil, nil
	}

	metrics := &domain.StudyGoldStandardMetrics{
		StudyID:    study.ID,
		StudyTitle: study.Title,
		TotalCases: len(cases),
	}

	// Accumulators for aggregate accuracy
	type systemAccum struct {
		totalAccuracy    float64
		casesEvaluated   int
		consensusCorrect int
		consensusTotal   int
	}
	accum := map[string]*systemAccum{
		"danis_weber":  {},
		"lauge_hansen": {},
		"ao_ota":       {},
		"bartonicek":   {},
	}

	// Per-rater tracking: userID -> system -> (correct, total)
	raterScores := make(map[uuid.UUID]map[string]*accuracyScore)

	for _, c := range cases {
		responses := responsesByCase[c.ID]

		gsAccuracy, err := s.CalculateGoldStandardAccuracy(&c, responses)
		if err != nil {
			return nil, err
		}

		pca := domain.PerCaseAccuracy{
			CaseOrder: c.CaseOrder,
			CaseID:    c.ID,
			CaseTitle: c.Title,
			HasGold:   gsAccuracy.HasGold,
		}

		if !gsAccuracy.HasGold {
			metrics.PerCaseAccuracy = append(metrics.PerCaseAccuracy, pca)
			continue
		}

		metrics.CasesWithGold++

		gold := gsAccuracy.GoldStandard

		// Aggregate per-system accuracy
		systemResults := map[string]*domain.SystemAccuracy{
			"danis_weber":  gsAccuracy.DanisWeberAccuracy,
			"lauge_hansen": gsAccuracy.LaugeHansenAccuracy,
			"ao_ota":       gsAccuracy.AOOTAAccuracy,
			"bartonicek":   gsAccuracy.BartonicekAccuracy,
		}

		for sys, sa := range systemResults {
			if sa == nil {
				continue
			}
			a := accum[sys]
			a.totalAccuracy += sa.Accuracy
			a.casesEvaluated++
			a.consensusTotal++
			if sa.MajorityMatchesGold {
				a.consensusCorrect++
			}
		}

		// Set per-case accuracy values
		if gsAccuracy.DanisWeberAccuracy != nil {
			v := gsAccuracy.DanisWeberAccuracy.Accuracy
			pca.DanisWeberAccuracy = &v
		}
		if gsAccuracy.LaugeHansenAccuracy != nil {
			v := gsAccuracy.LaugeHansenAccuracy.Accuracy
			pca.LaugeHansenAccuracy = &v
		}
		if gsAccuracy.AOOTAAccuracy != nil {
			v := gsAccuracy.AOOTAAccuracy.Accuracy
			pca.AOOTAAccuracy = &v
		}
		if gsAccuracy.BartonicekAccuracy != nil {
			v := gsAccuracy.BartonicekAccuracy.Accuracy
			pca.BartonicekAccuracy = &v
		}

		// Flag hard cases (any system < 50% accuracy)
		pca.IsHardCase = isHardCase(pca)

		metrics.PerCaseAccuracy = append(metrics.PerCaseAccuracy, pca)

		// Track per-rater accuracy
		if gold != nil {
			s.trackRaterAccuracy(raterScores, responses, gold)
		}
	}

	// Build aggregate accuracy per system
	for sys, a := range accum {
		if a.casesEvaluated == 0 {
			continue
		}
		agg := &domain.AggregateAccuracy{
			System:           sys,
			MeanAccuracy:     a.totalAccuracy / float64(a.casesEvaluated),
			CasesEvaluated:   a.casesEvaluated,
			ConsensusCorrect: a.consensusCorrect,
			ConsensusTotal:   a.consensusTotal,
		}
		if a.consensusTotal > 0 {
			agg.ConsensusRate = float64(a.consensusCorrect) / float64(a.consensusTotal) * 100
		}

		switch sys {
		case "danis_weber":
			metrics.DanisWeberAccuracy = agg
		case "lauge_hansen":
			metrics.LaugeHansenAccuracy = agg
		case "ao_ota":
			metrics.AOOTAAccuracy = agg
		case "bartonicek":
			metrics.BartonicekAccuracy = agg
		}
	}

	// Build per-rater accuracy
	for userID, systems := range raterScores {
		pra := domain.PerRaterAccuracy{
			UserID: userID,
		}
		maxCases := 0
		for _, score := range systems {
			if score.total > maxCases {
				maxCases = score.total
			}
		}
		pra.CasesCompleted = maxCases

		if s := systems["danis_weber"]; s != nil && s.total > 0 {
			v := float64(s.correct) / float64(s.total) * 100
			pra.DanisWeberAccuracy = &v
		}
		if s := systems["lauge_hansen"]; s != nil && s.total > 0 {
			v := float64(s.correct) / float64(s.total) * 100
			pra.LaugeHansenAccuracy = &v
		}
		if s := systems["ao_ota"]; s != nil && s.total > 0 {
			v := float64(s.correct) / float64(s.total) * 100
			pra.AOOTAAccuracy = &v
		}
		if s := systems["bartonicek"]; s != nil && s.total > 0 {
			v := float64(s.correct) / float64(s.total) * 100
			pra.BartonicekAccuracy = &v
		}

		metrics.PerRaterAccuracy = append(metrics.PerRaterAccuracy, pra)
	}

	return metrics, nil
}

// trackRaterAccuracy updates per-rater accuracy scores for a single case.
func (s *StatisticsService) trackRaterAccuracy(
	raterScores map[uuid.UUID]map[string]*accuracyScore,
	responses []domain.CaseResponse,
	gold *domain.ClassificationResult,
) {
	type systemCheck struct {
		system    string
		goldValue string
		raterVal  *string
	}

	for _, r := range responses {
		if raterScores[r.UserID] == nil {
			raterScores[r.UserID] = make(map[string]*accuracyScore)
		}

		var checks []systemCheck
		if gold.DanisWeber != nil {
			checks = append(checks, systemCheck{"danis_weber", string(gold.DanisWeber.Type), r.DanisWeberType})
		}
		if gold.LaugeHansen != nil {
			checks = append(checks, systemCheck{"lauge_hansen", string(gold.LaugeHansen.Type), r.LaugeHansenType})
		}
		if gold.AOOTA != nil {
			checks = append(checks, systemCheck{"ao_ota", string(gold.AOOTA.Code), r.AOOTACode})
		}
		if gold.Bartonicek != nil {
			checks = append(checks, systemCheck{"bartonicek", string(gold.Bartonicek.Type), r.BartonicekType})
		}

		scores := raterScores[r.UserID]
		for _, check := range checks {
			if check.raterVal == nil {
				continue
			}
			if scores[check.system] == nil {
				scores[check.system] = &accuracyScore{}
			}
			scores[check.system].total++
			if *check.raterVal == check.goldValue {
				scores[check.system].correct++
			}
		}
	}
}

// isHardCase returns true if any system has less than 50% accuracy against gold standard.
func isHardCase(pca domain.PerCaseAccuracy) bool {
	if pca.DanisWeberAccuracy != nil && *pca.DanisWeberAccuracy < 50 {
		return true
	}
	if pca.LaugeHansenAccuracy != nil && *pca.LaugeHansenAccuracy < 50 {
		return true
	}
	if pca.AOOTAAccuracy != nil && *pca.AOOTAAccuracy < 50 {
		return true
	}
	if pca.BartonicekAccuracy != nil && *pca.BartonicekAccuracy < 50 {
		return true
	}
	return false
}
