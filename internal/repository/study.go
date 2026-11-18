package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
)

// CaseAssignment pairs a case ID with a display order for batch operations.
type CaseAssignment struct {
	CaseID    uuid.UUID
	CaseOrder int
}

// StudyRepository defines the interface for study persistence operations.
type StudyRepository interface {
	// Create creates a new study.
	Create(ctx context.Context, study *domain.Study) error
	// GetByID retrieves a study by its ID.
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Study, error)
	// Update updates a study.
	Update(ctx context.Context, study *domain.Study) error
	// Delete deletes a study by its ID (cascades to cases and raters).
	Delete(ctx context.Context, id uuid.UUID) error
	// List retrieves studies with optional status filter and pagination.
	List(ctx context.Context, status *domain.StudyStatus, limit, offset int) ([]domain.Study, int64, error)

	// Case management (cases with study_id set)
	// AddCase assigns a case to a study with the given case order.
	AddCase(ctx context.Context, studyID, caseID uuid.UUID, caseOrder int) error
	// RemoveCase removes a case from a study (clears study_id).
	RemoveCase(ctx context.Context, studyID, caseID uuid.UUID) error
	// GetCases retrieves all cases in a study, ordered by case_order.
	GetCases(ctx context.Context, studyID uuid.UUID) ([]domain.Case, error)
	// ReorderCases updates the case_order of cases in a study.
	ReorderCases(ctx context.Context, studyID uuid.UUID, caseIDs []uuid.UUID) error
	// GetStudyByCaseID retrieves the study that contains a case (if any).
	GetStudyByCaseID(ctx context.Context, caseID uuid.UUID) (*domain.Study, error)
	// GetNextCaseOrder returns the next available case order for a study.
	GetNextCaseOrder(ctx context.Context, studyID uuid.UUID) (int, error)
	// AddCases assigns multiple cases to a study in a single transaction.
	AddCases(ctx context.Context, studyID uuid.UUID, assignments []CaseAssignment) error

	// Status transitions
	// Activate changes a study from draft to active.
	Activate(ctx context.Context, id uuid.UUID) error
	// Close changes a study to closed status.
	Close(ctx context.Context, id uuid.UUID) error

	// Counter updates
	// UpdateCounters recalculates and updates all denormalized counters.
	UpdateCounters(ctx context.Context, studyID uuid.UUID) error
}

// StudyResponseRepository handles response queries across studies.
type StudyResponseRepository interface {
	// GetAllByStudy retrieves all responses for all cases in a study.
	// Returns a map of caseID -> responses.
	GetAllByStudy(ctx context.Context, studyID uuid.UUID) (map[uuid.UUID][]domain.CaseResponse, error)

	// GetCompleteRaterResponses retrieves responses only from raters who completed all cases.
	// Returns a map of caseID -> responses (filtered to complete raters only).
	GetCompleteRaterResponses(ctx context.Context, studyID uuid.UUID) (map[uuid.UUID][]domain.CaseResponse, error)

	// CountUniqueRaters counts unique users who responded to any case in the study.
	CountUniqueRaters(ctx context.Context, studyID uuid.UUID) (int64, error)

	// CountCompleteRaters counts users who responded to ALL cases in the study.
	CountCompleteRaters(ctx context.Context, studyID uuid.UUID) (int64, error)

	// GetRaterCaseCompletion returns a map of userID -> list of caseIDs they completed.
	GetRaterCaseCompletion(ctx context.Context, studyID uuid.UUID) (map[uuid.UUID][]uuid.UUID, error)

	// CountUserCasesCompleted counts how many cases a specific user has completed in a study.
	CountUserCasesCompleted(ctx context.Context, studyID, userID uuid.UUID) (int, error)
}
