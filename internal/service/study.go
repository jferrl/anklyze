package service

import (
	"context"
	"log/slog"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/repository"
)

// ReliabilityCalculator computes study-level reliability metrics.
// Defined here to break the direct dependency on *StatisticsService in handlers.
type ReliabilityCalculator interface {
	CalculateStudyReliabilityMetrics(study *domain.Study, cases []domain.Case, responsesByCase map[uuid.UUID][]domain.CaseResponse) (*domain.StudyReliabilityMetrics, error)
}

// GoldStandardCalculator computes study-level gold standard accuracy metrics.
type GoldStandardCalculator interface {
	CalculateStudyGoldStandardMetrics(study *domain.Study, cases []domain.Case, responsesByCase map[uuid.UUID][]domain.CaseResponse) (*domain.StudyGoldStandardMetrics, error)
}

// StudyService manages all study-related business logic including case-study
// relationship management, response validation, and reliability metrics.
type StudyService interface {
	// Case-study relationship management
	AddCase(ctx context.Context, studyID, caseID uuid.UUID, caseOrder int) error
	RemoveCase(ctx context.Context, studyID, caseID uuid.UUID) error
	IsCaseInStudy(ctx context.Context, caseID uuid.UUID) (bool, *uuid.UUID, error)

	// Reliability metrics (orchestrates data fetching + ReliabilityCalculator call)
	GetReliabilityMetrics(ctx context.Context, studyID uuid.UUID) (*domain.StudyReliabilityMetrics, error)

	// Gold standard accuracy metrics (orchestrates data fetching + GoldStandardCalculator call)
	GetGoldStandardMetrics(ctx context.Context, studyID uuid.UUID) (*domain.StudyGoldStandardMetrics, error)

	// Background updates after response submission
	UpdateAfterResponse(ctx context.Context, studyID uuid.UUID)
}

type studyService struct {
	studyRepo         repository.StudyRepository
	studyResponseRepo repository.StudyResponseRepository
	caseRepo          repository.CaseRepository
	responseRepo      repository.CaseResponseRepository
	reliabilityCalc   ReliabilityCalculator
	goldStandardCalc  GoldStandardCalculator
	statsCache        StudyStatsCache
}

// NewStudyService creates a new StudyService.
func NewStudyService(
	studyRepo repository.StudyRepository,
	studyResponseRepo repository.StudyResponseRepository,
	caseRepo repository.CaseRepository,
	responseRepo repository.CaseResponseRepository,
	reliabilityCalc ReliabilityCalculator,
	goldStandardCalc GoldStandardCalculator,
	statsCache StudyStatsCache,
) StudyService {
	return &studyService{
		studyRepo:         studyRepo,
		studyResponseRepo: studyResponseRepo,
		caseRepo:          caseRepo,
		responseRepo:      responseRepo,
		reliabilityCalc:   reliabilityCalc,
		goldStandardCalc:  goldStandardCalc,
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

// GetGoldStandardMetrics orchestrates data fetching and calculates study-level
// gold standard accuracy metrics by delegating to the GoldStandardCalculator.
func (s *studyService) GetGoldStandardMetrics(ctx context.Context, studyID uuid.UUID) (*domain.StudyGoldStandardMetrics, error) {
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

	return s.goldStandardCalc.CalculateStudyGoldStandardMetrics(study, cases, responsesByCase)
}

// UpdateAfterResponse invalidates the stats cache and updates study counters
// after a response is submitted. Intended to be called in a background goroutine.
func (s *studyService) UpdateAfterResponse(ctx context.Context, studyID uuid.UUID) {
	s.statsCache.Invalidate(studyID)

	if err := s.studyRepo.UpdateCounters(ctx, studyID); err != nil {
		slog.Error("failed to update study counters after response",
			"error", err,
			"study_id", studyID,
		)
	}
}
