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
	TotalAnswers     int            `json:"total_answers"`
	CorrectAnswers   int            `json:"correct_answers"`
	IncorrectAnswers int            `json:"incorrect_answers"`
	ErrorRate        float64        `json:"error_rate"`
	WrongAnswerDist  map[string]int `json:"wrong_answer_distribution"`
	AvgTimeMS        float64        `json:"avg_time_ms"`
}

// DivergenceReport is the complete analysis output.
type DivergenceReport struct {
	StudyID           uuid.UUID             `json:"study_id"`
	StudyTitle        string                `json:"study_title"`
	TotalResponses    int                   `json:"total_responses"`
	ResponsesWithPath int                   `json:"responses_with_path"`

	// Per-question analysis
	QuestionStats     []QuestionErrorStats `json:"question_stats"`
	MostConfusingQ    string               `json:"most_confusing_question"`
	MostConfusingRate float64              `json:"most_confusing_error_rate"`

	// Path distribution
	PathDistribution map[string]int `json:"path_distribution"`
	CorrectPath      string         `json:"correct_path"`

	// Back button analysis
	AvgBackClicks        float64 `json:"avg_back_clicks"`
	BackClickCorrelation string  `json:"back_click_correlation"` // "positive", "negative", "none"
}

// DivergenceService handles divergence analysis calculations.
type DivergenceService struct {
	responseRepo repository.StudyResponseRepository
	studyRepo    repository.StudyRepository
}

// NewDivergenceService creates a new divergence service.
func NewDivergenceService(rr repository.StudyResponseRepository, sr repository.StudyRepository) *DivergenceService {
	return &DivergenceService{
		responseRepo: rr,
		studyRepo:    sr,
	}
}

// AnalyzeDivergence generates a complete divergence report for a study.
func (s *DivergenceService) AnalyzeDivergence(ctx context.Context, studyID uuid.UUID) (*DivergenceReport, error) {
	// 1. Get study with gold standard input
	study, err := s.studyRepo.GetByID(ctx, studyID)
	if err != nil {
		return nil, err
	}
	if study == nil {
		return nil, errors.New("study not found")
	}

	if !study.HasReferenceInput() {
		return nil, errors.New("study has no gold standard input stored")
	}

	goldInput, err := study.GetReferenceInput()
	if err != nil {
		return nil, err
	}

	// 2. Get all responses for this study
	responses, err := s.responseRepo.GetAllByStudy(ctx, studyID)
	if err != nil {
		return nil, err
	}

	// 3. Build gold standard answer path
	goldPath := buildAnswerPathFromInput(goldInput)
	goldPathStr := buildDecisionPathString(goldInput)

	// 4. Initialize report
	report := &DivergenceReport{
		StudyID:          studyID,
		StudyTitle:       study.Title,
		TotalResponses:   len(responses),
		CorrectPath:      goldPathStr,
		PathDistribution: make(map[string]int),
	}

	questionStats := make(map[string]*QuestionErrorStats)
	var totalBackClicks int
	var correctWithHighBack, incorrectWithHighBack int

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

		// Compare each answer against gold standard
		for _, qa := range userPath {
			// Initialize stats for this question if needed
			if _, exists := questionStats[qa.Question]; !exists {
				questionStats[qa.Question] = &QuestionErrorStats{
					Question:        qa.Question,
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
			}

			// Track time
			if timePerQ != nil {
				if t, ok := timePerQ[qa.Question]; ok {
					stats.AvgTimeMS += float64(t)
				}
			}
		}

		// Correlation analysis
		isCorrect := resp.DecisionPath == goldPathStr
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

	// Back click correlation
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
		"involved_malleoli":              "Involved Malleoli",
		"fibular_level":                  "Fibular Level",
		"lateral_morphology":             "Lateral Morphology",
		"medial_morphology":              "Medial Morphology",
		"suprasindesmal_type":            "Suprasindesmal Type",
		"fibula_trace_pattern":           "Fibula Trace Pattern",
		"posterior_fracture_type":        "Posterior Fracture Type",
		"has_ct_scan":                    "Has CT Scan",
		"fibula_infrasindesmal_transverse": "Fibula Infrasindesmal Transverse",
		"fibular_level_for_transverse":   "Fibular Level for Transverse",
	}
	if name, ok := names[key]; ok {
		return name
	}
	return key
}
