package service

import (
	"context"
	"errors"
	"sort"
	"strings"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/repository"
)

// DivergencePoint represents where a user's answer diverged from gold standard.
type DivergencePoint struct {
	Question      string `json:"question"`
	UserAnswer    string `json:"user_answer"`
	CorrectAnswer string `json:"correct_answer"`
	StepNumber    int    `json:"step_number"`
}

// QuestionErrorStats tracks error rates for a specific question.
type QuestionErrorStats struct {
	Question         string         `json:"question"`
	CorrectAnswer    string         `json:"correct_answer"`
	TotalAnswers     int            `json:"total_answers"`
	CorrectAnswers   int            `json:"correct_answers"`
	IncorrectAnswers int            `json:"incorrect_answers"`
	ErrorRate        float64        `json:"error_rate"`
	WrongAnswerDist  map[string]int `json:"wrong_answer_distribution"`
	AvgTimeMS        float64        `json:"avg_time_ms"`
}

// DivergenceReport is the complete analysis output.
type DivergenceReport struct {
	CaseID            uuid.UUID            `json:"case_id"`
	CaseTitle         string               `json:"case_title"`
	TotalResponses    int                  `json:"total_responses"`
	ResponsesWithPath int                  `json:"responses_with_path"`

	// Per-question analysis
	QuestionStats     []QuestionErrorStats `json:"question_stats"`
	MostConfusingQ    string               `json:"most_confusing_question"`
	MostConfusingRate float64              `json:"most_confusing_error_rate"`

	// Path distribution
	PathDistribution   map[string]int `json:"path_distribution"`
	CorrectPath        string         `json:"correct_path"`
	CorrectPathCount   int            `json:"correct_path_count"`
	CorrectPathPercent float64        `json:"correct_path_percent"`
	UniquePathsCount   int            `json:"unique_paths_count"`

	// Divergence analysis
	FirstDivergenceStats map[string]int `json:"first_divergence_stats"` // question -> count of users who first diverged here
	MostCommonFirstDiv   string         `json:"most_common_first_divergence"`

	// Back button analysis
	AvgBackClicks            float64 `json:"avg_back_clicks"`
	BackClickCorrelation     string  `json:"back_click_correlation"` // "positive", "negative", "none"
	CorrectWithHighBackCount int     `json:"correct_with_high_back_count"`
	IncorrectWithHighBackCnt int     `json:"incorrect_with_high_back_count"`
}

// DivergenceService handles divergence analysis calculations.
type DivergenceService struct {
	responseRepo repository.CaseResponseRepository
	caseRepo     repository.CaseRepository
}

// NewDivergenceService creates a new divergence service.
func NewDivergenceService(rr repository.CaseResponseRepository, cr repository.CaseRepository) *DivergenceService {
	return &DivergenceService{
		responseRepo: rr,
		caseRepo:     cr,
	}
}

// AnalyzeDivergence generates a complete divergence report for a case.
func (s *DivergenceService) AnalyzeDivergence(ctx context.Context, caseID uuid.UUID) (*DivergenceReport, error) {
	// 1. Get case with gold standard input
	cs, err := s.caseRepo.GetByID(ctx, caseID)
	if err != nil {
		return nil, err
	}
	if cs == nil {
		return nil, errors.New("case not found")
	}

	if !cs.HasReferenceInput() {
		return nil, errors.New("case has no gold standard input stored")
	}

	goldInput, err := cs.GetReferenceInput()
	if err != nil {
		return nil, err
	}

	// 2. Get all responses for this case
	responses, err := s.responseRepo.GetAllByCase(ctx, caseID)
	if err != nil {
		return nil, err
	}

	// 3. Build gold standard answer path
	goldPath := buildAnswerPathFromInput(goldInput)
	goldPathStr := buildDecisionPathString(goldInput)

	// 4. Initialize report
	report := &DivergenceReport{
		CaseID:               caseID,
		CaseTitle:            cs.Title,
		TotalResponses:       len(responses),
		CorrectPath:          goldPathStr,
		PathDistribution:     make(map[string]int),
		FirstDivergenceStats: make(map[string]int),
	}

	questionStats := make(map[string]*QuestionErrorStats)
	var totalBackClicks int
	var correctWithHighBack, incorrectWithHighBack int
	var correctPathCount int

	// 5. Analyze each response
	for _, resp := range responses {
		// Parse answer path
		userPath, err := resp.GetAnswerPath()
		if err != nil || len(userPath) == 0 {
			continue // Skip responses without answer path (historical data)
		}

		report.ResponsesWithPath++

		timePerQ, _ := resp.GetTimePerQuestion()

		// Track path distribution
		if resp.DecisionPath != "" {
			report.PathDistribution[resp.DecisionPath]++
		}

		// Track back clicks
		totalBackClicks += resp.BackClicks

		// Track if this user got the correct path
		isCorrect := resp.DecisionPath == goldPathStr
		if isCorrect {
			correctPathCount++
		}

		// Track first divergence point
		firstDivergenceFound := false

		// Compare each answer against gold standard
		for _, qa := range userPath {
			// Initialize stats for this question if needed
			if _, exists := questionStats[qa.Question]; !exists {
				questionStats[qa.Question] = &QuestionErrorStats{
					Question:        qa.Question,
					CorrectAnswer:   goldPath[qa.Question],
					WrongAnswerDist: make(map[string]int),
				}
			}

			stats := questionStats[qa.Question]
			stats.TotalAnswers++

			// Find gold standard answer for this question
			goldAnswer := goldPath[qa.Question]

			if qa.Answer == goldAnswer {
				stats.CorrectAnswers++
			} else if goldAnswer != "" {
				// Only count as incorrect if there was a gold answer for this question
				stats.IncorrectAnswers++
				stats.WrongAnswerDist[qa.Answer]++

				// Track first divergence point (only once per response)
				if !firstDivergenceFound {
					report.FirstDivergenceStats[qa.Question]++
					firstDivergenceFound = true
				}
			}

			// Track time
			if timePerQ != nil {
				if t, ok := timePerQ[qa.Question]; ok {
					stats.AvgTimeMS += float64(t)
				}
			}
		}

		// Correlation analysis
		if resp.BackClicks > 2 {
			if isCorrect {
				correctWithHighBack++
			} else {
				incorrectWithHighBack++
			}
		}
	}

	// 6. Calculate final statistics
	var maxErrorRate float64
	for q, stats := range questionStats {
		if stats.TotalAnswers > 0 {
			stats.ErrorRate = float64(stats.IncorrectAnswers) / float64(stats.TotalAnswers)
			stats.AvgTimeMS = stats.AvgTimeMS / float64(stats.TotalAnswers)

			if stats.ErrorRate > maxErrorRate {
				maxErrorRate = stats.ErrorRate
				report.MostConfusingQ = q
				report.MostConfusingRate = stats.ErrorRate
			}
		}
		report.QuestionStats = append(report.QuestionStats, *stats)
	}

	// Sort by error rate descending
	sort.Slice(report.QuestionStats, func(i, j int) bool {
		return report.QuestionStats[i].ErrorRate > report.QuestionStats[j].ErrorRate
	})

	if report.ResponsesWithPath > 0 {
		report.AvgBackClicks = float64(totalBackClicks) / float64(report.ResponsesWithPath)
	}

	// Path accuracy stats
	report.CorrectPathCount = correctPathCount
	report.UniquePathsCount = len(report.PathDistribution)
	if report.ResponsesWithPath > 0 {
		report.CorrectPathPercent = float64(correctPathCount) / float64(report.ResponsesWithPath) * 100
	}

	// Find most common first divergence point
	var maxDivCount int
	for q, count := range report.FirstDivergenceStats {
		if count > maxDivCount {
			maxDivCount = count
			report.MostCommonFirstDiv = q
		}
	}

	// Back click correlation
	report.CorrectWithHighBackCount = correctWithHighBack
	report.IncorrectWithHighBackCnt = incorrectWithHighBack
	if correctWithHighBack > incorrectWithHighBack {
		report.BackClickCorrelation = "positive" // More back clicks = more correct
	} else if incorrectWithHighBack > correctWithHighBack {
		report.BackClickCorrelation = "negative" // More back clicks = more incorrect
	} else {
		report.BackClickCorrelation = "none"
	}

	return report, nil
}

// buildAnswerPathFromInput converts a FractureInput to a map of question->answer.
func buildAnswerPathFromInput(input *domain.FractureInput) map[string]string {
	path := make(map[string]string)

	path["involved_malleoli"] = string(input.InvolvedMalleoli)

	if input.FibularLevel != "" {
		path["fibular_level"] = string(input.FibularLevel)
	}
	if input.LateralMorphology != "" {
		path["lateral_morphology"] = string(input.LateralMorphology)
	}
	if input.MedialMorphology != "" {
		path["medial_morphology"] = string(input.MedialMorphology)
	}
	if input.SuprasindesmalType != "" {
		path["suprasindesmal_type"] = string(input.SuprasindesmalType)
	}
	if input.FibulaTracePattern != "" {
		path["fibula_trace_pattern"] = string(input.FibulaTracePattern)
	}
	if input.PosteriorFractureType != "" {
		path["posterior_fracture_type"] = string(input.PosteriorFractureType)
	}
	if input.HasCTScan != nil {
		if *input.HasCTScan {
			path["has_ct_scan"] = "true"
		} else {
			path["has_ct_scan"] = "false"
		}
	}
	if input.FibulaInfrasindesmalTransverse != nil {
		if *input.FibulaInfrasindesmalTransverse {
			path["fibula_infrasindesmal_transverse"] = "true"
		} else {
			path["fibula_infrasindesmal_transverse"] = "false"
		}
	}
	if input.FibularLevelForTransverse != "" {
		path["fibular_level_for_transverse"] = string(input.FibularLevelForTransverse)
	}

	return path
}

// buildDecisionPathString creates a string representation of the decision path.
func buildDecisionPathString(input *domain.FractureInput) string {
	var parts []string

	parts = append(parts, string(input.InvolvedMalleoli))

	if input.FibularLevel != "" {
		parts = append(parts, string(input.FibularLevel))
	}
	if input.LateralMorphology != "" {
		parts = append(parts, string(input.LateralMorphology))
	}
	if input.MedialMorphology != "" {
		parts = append(parts, string(input.MedialMorphology))
	}
	if input.SuprasindesmalType != "" {
		parts = append(parts, string(input.SuprasindesmalType))
	}
	if input.FibulaTracePattern != "" {
		parts = append(parts, string(input.FibulaTracePattern))
	}
	if input.PosteriorFractureType != "" {
		parts = append(parts, string(input.PosteriorFractureType))
	}

	return strings.Join(parts, "→")
}

// GetQuestionDisplayName returns a human-readable name for a question key.
func GetQuestionDisplayName(key string) string {
	names := map[string]string{
		"involved_malleoli":               "Involved Malleoli",
		"fibular_level":                   "Fibular Level",
		"lateral_morphology":              "Lateral Morphology",
		"medial_morphology":               "Medial Morphology",
		"suprasindesmal_type":             "Suprasindesmal Type",
		"fibula_trace_pattern":            "Fibula Trace Pattern",
		"posterior_fracture_type":         "Posterior Fracture Type",
		"has_ct_scan":                     "Has CT Scan",
		"fibula_infrasindesmal_transverse": "Fibula Infrasindesmal Transverse",
		"fibular_level_for_transverse":    "Fibular Level for Transverse",
	}
	if name, ok := names[key]; ok {
		return name
	}
	return key
}
