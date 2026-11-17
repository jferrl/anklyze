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

// systemAccum accumulates one system's per-case accuracy across a study.
type systemAccum struct {
	totalAccuracy    float64
	casesEvaluated   int
	consensusCorrect int
}

func (a *systemAccum) add(sa *domain.SystemAccuracy) {
	if sa == nil {
		return
	}
	a.totalAccuracy += sa.Accuracy
	a.casesEvaluated++
	if sa.MajorityMatchesGold {
		a.consensusCorrect++
	}
}

// aggregate returns nil when no case had data for the system.
func (a *systemAccum) aggregate(system string) *domain.AggregateAccuracy {
	if a.casesEvaluated == 0 {
		return nil
	}
	return &domain.AggregateAccuracy{
		System:           system,
		MeanAccuracy:     a.totalAccuracy / float64(a.casesEvaluated),
		CasesEvaluated:   a.casesEvaluated,
		ConsensusCorrect: a.consensusCorrect,
		ConsensusTotal:   a.casesEvaluated,
		ConsensusRate:    float64(a.consensusCorrect) / float64(a.casesEvaluated) * 100,
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

	var danisWeber, laugeHansen, aoOTA, bartonicek systemAccum

	// Per-rater tracking: userID -> system -> (correct, total)
	raterScores := make(map[uuid.UUID]map[string]*accuracyScore)

	for _, c := range cases {
		responses := responsesByCase[c.ID]

		gsAccuracy, err := s.CalculateGoldStandardAccuracy(&c, responses)
		if err != nil {
			return nil, err
		}

		metrics.PerCaseAccuracy = append(metrics.PerCaseAccuracy, perCaseAccuracy(&c, gsAccuracy))
		if !gsAccuracy.HasGold {
			continue
		}

		metrics.CasesWithGold++

		danisWeber.add(gsAccuracy.DanisWeberAccuracy)
		laugeHansen.add(gsAccuracy.LaugeHansenAccuracy)
		aoOTA.add(gsAccuracy.AOOTAAccuracy)
		bartonicek.add(gsAccuracy.BartonicekAccuracy)

		s.trackRaterAccuracy(raterScores, responses, gsAccuracy.GoldStandard)
	}

	metrics.DanisWeberAccuracy = danisWeber.aggregate("danis_weber")
	metrics.LaugeHansenAccuracy = laugeHansen.aggregate("lauge_hansen")
	metrics.AOOTAAccuracy = aoOTA.aggregate("ao_ota")
	metrics.BartonicekAccuracy = bartonicek.aggregate("bartonicek")

	for userID, systems := range raterScores {
		metrics.PerRaterAccuracy = append(metrics.PerRaterAccuracy, perRaterAccuracy(userID, systems))
	}

	return metrics, nil
}

// perCaseAccuracy builds the per-case row; accuracy fields stay nil without a gold standard.
func perCaseAccuracy(c *domain.Case, gsAccuracy *domain.GoldStandardAccuracy) domain.PerCaseAccuracy {
	pca := domain.PerCaseAccuracy{
		CaseOrder: c.CaseOrder,
		CaseID:    c.ID,
		CaseTitle: c.Title,
		HasGold:   gsAccuracy.HasGold,
	}
	if !gsAccuracy.HasGold {
		return pca
	}

	pca.DanisWeberAccuracy = accuracyOf(gsAccuracy.DanisWeberAccuracy)
	pca.LaugeHansenAccuracy = accuracyOf(gsAccuracy.LaugeHansenAccuracy)
	pca.AOOTAAccuracy = accuracyOf(gsAccuracy.AOOTAAccuracy)
	pca.BartonicekAccuracy = accuracyOf(gsAccuracy.BartonicekAccuracy)
	pca.IsHardCase = isHardCase(pca)
	return pca
}

func accuracyOf(sa *domain.SystemAccuracy) *float64 {
	if sa == nil {
		return nil
	}
	v := sa.Accuracy
	return &v
}

// perRaterAccuracy turns one rater's correct/total counts into percentages.
func perRaterAccuracy(userID uuid.UUID, systems map[string]*accuracyScore) domain.PerRaterAccuracy {
	pra := domain.PerRaterAccuracy{UserID: userID}
	for _, score := range systems {
		pra.CasesCompleted = max(pra.CasesCompleted, score.total)
	}
	pra.DanisWeberAccuracy = systems["danis_weber"].percent()
	pra.LaugeHansenAccuracy = systems["lauge_hansen"].percent()
	pra.AOOTAAccuracy = systems["ao_ota"].percent()
	pra.BartonicekAccuracy = systems["bartonicek"].percent()
	return pra
}

// percent is nil for a rater who gave no answer for the system.
func (a *accuracyScore) percent() *float64 {
	if a == nil || a.total == 0 {
		return nil
	}
	v := float64(a.correct) / float64(a.total) * 100
	return &v
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
