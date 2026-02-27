package service

import (
	"context"
	"errors"
	"log/slog"
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

// ReliabilityCalculator computes study-level reliability metrics.
// Defined here to break the direct dependency on *StatisticsService in handlers.
type ReliabilityCalculator interface {
	CalculateStudyReliabilityMetrics(study *domain.Study, cases []domain.Case, responsesByCase map[uuid.UUID][]domain.CaseResponse) (*domain.StudyReliabilityMetrics, error)
}

// StudyService manages all study-related business logic including case-study
// relationship management, response validation, reliability metrics, and divergence analysis.
type StudyService interface {
	// Case-study relationship management
	AddCase(ctx context.Context, studyID, caseID uuid.UUID, caseOrder int) error
	RemoveCase(ctx context.Context, studyID, caseID uuid.UUID) error
	IsCaseInStudy(ctx context.Context, caseID uuid.UUID) (bool, *uuid.UUID, error)

	// Access control
	HasAccess(ctx context.Context, studyID, userID uuid.UUID) (bool, error)
	ValidateResponseSubmission(ctx context.Context, caseID, userID uuid.UUID) error

	// Reliability metrics (orchestrates data fetching + ReliabilityCalculator call)
	GetReliabilityMetrics(ctx context.Context, studyID uuid.UUID) (*domain.StudyReliabilityMetrics, error)

	// Divergence analysis (absorbed from DivergenceService)
	GetDivergenceAnalysis(ctx context.Context, caseID uuid.UUID) (*DivergenceReport, error)

	// Background updates after response submission
	UpdateProgressAfterResponse(ctx context.Context, studyID uuid.UUID, caseID, userID uuid.UUID)
}

type studyService struct {
	studyRepo         repository.StudyRepository
	studyResponseRepo repository.StudyResponseRepository
	caseRepo          repository.CaseRepository
	responseRepo      repository.CaseResponseRepository
	reliabilityCalc   ReliabilityCalculator
	statsCache        StudyStatsCache
}

// NewStudyService creates a new StudyService.
func NewStudyService(
	studyRepo repository.StudyRepository,
	studyResponseRepo repository.StudyResponseRepository,
	caseRepo repository.CaseRepository,
	responseRepo repository.CaseResponseRepository,
	reliabilityCalc ReliabilityCalculator,
	statsCache StudyStatsCache,
) StudyService {
	return &studyService{
		studyRepo:         studyRepo,
		studyResponseRepo: studyResponseRepo,
		caseRepo:          caseRepo,
		responseRepo:      responseRepo,
		reliabilityCalc:   reliabilityCalc,
		statsCache:        statsCache,
	}
}

// AddCase adds a case to a study and updates the study counters.
func (s *studyService) AddCase(ctx context.Context, studyID, caseID uuid.UUID, caseOrder int) error {
	if err := s.studyRepo.AddCase(ctx, studyID, caseID, caseOrder); err != nil {
		return err
	}
	if err := s.studyRepo.UpdateCounters(ctx, studyID); err != nil {
		slog.Error("failed to update study counters after AddCase",
			"error", err,
			"study_id", studyID,
			"case_id", caseID,
		)
		// Counter update failure is non-fatal — the case was added successfully.
	}
	return nil
}

// RemoveCase removes a case from a study and updates the study counters.
func (s *studyService) RemoveCase(ctx context.Context, studyID, caseID uuid.UUID) error {
	if err := s.studyRepo.RemoveCase(ctx, studyID, caseID); err != nil {
		return err
	}
	if err := s.studyRepo.UpdateCounters(ctx, studyID); err != nil {
		slog.Error("failed to update study counters after RemoveCase",
			"error", err,
			"study_id", studyID,
			"case_id", caseID,
		)
	}
	return nil
}

// IsCaseInStudy checks whether a case belongs to any study.
// Returns (true, &studyID, nil) if the case is in a study, (false, nil, nil) if not.
func (s *studyService) IsCaseInStudy(ctx context.Context, caseID uuid.UUID) (bool, *uuid.UUID, error) {
	study, err := s.studyRepo.GetStudyByCaseID(ctx, caseID)
	if err != nil {
		return false, nil, err
	}
	if study == nil {
		return false, nil, nil
	}
	return true, &study.ID, nil
}

// HasAccess checks if a user has access to a study.
func (s *studyService) HasAccess(ctx context.Context, studyID, userID uuid.UUID) (bool, error) {
	return s.studyRepo.HasAccess(ctx, studyID, userID)
}

// ValidateResponseSubmission checks that the user is allowed to submit a response
// for a case that belongs to a study. If the case is not in a study, this is a no-op.
// Returns domain.ErrNotStudyMember if the user is not assigned to the study.
func (s *studyService) ValidateResponseSubmission(ctx context.Context, caseID, userID uuid.UUID) error {
	cs, err := s.caseRepo.GetByID(ctx, caseID)
	if err != nil {
		return err
	}
	if cs == nil {
		// Case not found — let the handler deal with 404; don't block here.
		return nil
	}

	// Only validate if the case belongs to a study.
	if cs.StudyID == nil {
		return nil
	}

	hasAccess, err := s.studyRepo.HasAccess(ctx, *cs.StudyID, userID)
	if err != nil {
		return err
	}
	if !hasAccess {
		return domain.ErrNotStudyMember
	}
	return nil
}

// GetReliabilityMetrics orchestrates data fetching and calculates study-level
// reliability metrics by delegating to the ReliabilityCalculator.
// Results are served from cache when available; cache is populated on miss.
func (s *studyService) GetReliabilityMetrics(ctx context.Context, studyID uuid.UUID) (*domain.StudyReliabilityMetrics, error) {
	// Check cache first — avoids expensive DB reads and kappa computation on repeated calls.
	if cached, ok := s.statsCache.Get(studyID); ok {
		return cached, nil
	}

	// Cache miss — full DB fetch + calculation.
	study, err := s.studyRepo.GetByID(ctx, studyID)
	if err != nil {
		return nil, err
	}
	if study == nil {
		return nil, domain.ErrNotFound
	}

	cases, err := s.studyRepo.GetCases(ctx, studyID)
	if err != nil {
		return nil, err
	}

	responsesByCase, err := s.studyResponseRepo.GetAllByStudy(ctx, studyID)
	if err != nil {
		return nil, err
	}

	metrics, err := s.reliabilityCalc.CalculateStudyReliabilityMetrics(study, cases, responsesByCase)
	if err != nil {
		return nil, err
	}

	// Populate cache for subsequent requests.
	s.statsCache.Set(studyID, metrics)
	return metrics, nil
}

// GetDivergenceAnalysis generates a complete divergence report for a case.
// This method absorbs the logic formerly in DivergenceService.AnalyzeDivergence.
func (s *studyService) GetDivergenceAnalysis(ctx context.Context, caseID uuid.UUID) (*DivergenceReport, error) {
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

// UpdateProgressAfterResponse updates rater progress in a study after a response is submitted.
// This is intended to be called in a background goroutine.
// The stats cache is invalidated first so the next read reflects the new response.
func (s *studyService) UpdateProgressAfterResponse(ctx context.Context, studyID uuid.UUID, caseID, userID uuid.UUID) {
	// Invalidate stats cache FIRST — ensures next GetReliabilityMetrics call recalculates.
	s.statsCache.Invalidate(studyID)

	casesCompleted, err := s.studyResponseRepo.CountUserCasesCompleted(ctx, studyID, userID)
	if err != nil {
		slog.Error("failed to count user cases completed",
			"error", err,
			"study_id", studyID,
			"user_id", userID,
		)
		return
	}
	if err := s.studyRepo.UpdateRaterProgress(ctx, studyID, userID, casesCompleted); err != nil {
		slog.Error("failed to update study rater progress",
			"error", err,
			"study_id", studyID,
			"user_id", userID,
		)
	}
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
		"involved_malleoli":                "Involved Malleoli",
		"fibular_level":                    "Fibular Level",
		"lateral_morphology":               "Lateral Morphology",
		"medial_morphology":                "Medial Morphology",
		"suprasindesmal_type":              "Suprasindesmal Type",
		"fibula_trace_pattern":             "Fibula Trace Pattern",
		"posterior_fracture_type":          "Posterior Fracture Type",
		"has_ct_scan":                      "Has CT Scan",
		"fibula_infrasindesmal_transverse":  "Fibula Infrasindesmal Transverse",
		"fibular_level_for_transverse":     "Fibular Level for Transverse",
	}
	if name, ok := names[key]; ok {
		return name
	}
	return key
}
