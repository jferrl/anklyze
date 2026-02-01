package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
)

// CohortRepository defines the interface for cohort persistence operations.
type CohortRepository interface {
	// Create creates a new study cohort.
	Create(ctx context.Context, cohort *domain.StudyCohort) error
	// GetByID retrieves a cohort by its ID.
	GetByID(ctx context.Context, id uuid.UUID) (*domain.StudyCohort, error)
	// Update updates a cohort.
	Update(ctx context.Context, cohort *domain.StudyCohort) error
	// Delete deletes a cohort by its ID (cascades to cases and users).
	Delete(ctx context.Context, id uuid.UUID) error
	// List retrieves cohorts with optional status filter and pagination.
	List(ctx context.Context, status *domain.CohortStatus, limit, offset int) ([]domain.StudyCohort, int64, error)

	// Case management (studies with cohort_id set)
	// AddCase assigns a study to a cohort with the given case order.
	AddCase(ctx context.Context, cohortID, studyID uuid.UUID, caseOrder int) error
	// RemoveCase removes a study from a cohort (clears cohort_id).
	RemoveCase(ctx context.Context, cohortID, studyID uuid.UUID) error
	// GetCases retrieves all studies in a cohort, ordered by case_order.
	GetCases(ctx context.Context, cohortID uuid.UUID) ([]domain.Study, error)
	// ReorderCases updates the case_order of studies in a cohort.
	ReorderCases(ctx context.Context, cohortID uuid.UUID, studyIDs []uuid.UUID) error
	// GetCohortByStudyID retrieves the cohort that contains a study (if any).
	GetCohortByStudyID(ctx context.Context, studyID uuid.UUID) (*domain.StudyCohort, error)
	// GetNextCaseOrder returns the next available case order for a cohort.
	GetNextCaseOrder(ctx context.Context, cohortID uuid.UUID) (int, error)

	// User/Rater management
	// AddUser assigns a user as a rater to a cohort.
	AddUser(ctx context.Context, cohortID, userID uuid.UUID, email string) error
	// RemoveUser removes a user from a cohort.
	RemoveUser(ctx context.Context, cohortID, userID uuid.UUID) error
	// GetUsers retrieves all users assigned to a cohort.
	GetUsers(ctx context.Context, cohortID uuid.UUID) ([]domain.CohortUser, error)
	// HasAccess checks if a user is assigned to a cohort.
	HasAccess(ctx context.Context, cohortID, userID uuid.UUID) (bool, error)
	// GetRaterProgress retrieves completion progress for all raters in a cohort.
	GetRaterProgress(ctx context.Context, cohortID uuid.UUID) ([]domain.RaterProgress, error)
	// UpdateUserProgress updates a user's progress in a cohort.
	UpdateUserProgress(ctx context.Context, cohortID, userID uuid.UUID, casesCompleted int) error

	// Status transitions
	// Activate changes a cohort from draft to active.
	Activate(ctx context.Context, id uuid.UUID) error
	// Close changes a cohort to closed status.
	Close(ctx context.Context, id uuid.UUID) error

	// Counter updates
	// UpdateCounters recalculates and updates all denormalized counters.
	UpdateCounters(ctx context.Context, cohortID uuid.UUID) error
}

// CohortResponseRepository handles response queries across cohorts.
type CohortResponseRepository interface {
	// GetAllByCohort retrieves all responses for all cases in a cohort.
	// Returns a map of studyID -> responses.
	GetAllByCohort(ctx context.Context, cohortID uuid.UUID) (map[uuid.UUID][]domain.StudyResponse, error)

	// GetCompleteRaterResponses retrieves responses only from raters who completed all cases.
	// Returns a map of studyID -> responses (filtered to complete raters only).
	GetCompleteRaterResponses(ctx context.Context, cohortID uuid.UUID) (map[uuid.UUID][]domain.StudyResponse, error)

	// CountUniqueRaters counts unique users who responded to any case in the cohort.
	CountUniqueRaters(ctx context.Context, cohortID uuid.UUID) (int64, error)

	// CountCompleteRaters counts users who responded to ALL cases in the cohort.
	CountCompleteRaters(ctx context.Context, cohortID uuid.UUID) (int64, error)

	// GetRaterCaseCompletion returns a map of userID -> list of studyIDs they completed.
	GetRaterCaseCompletion(ctx context.Context, cohortID uuid.UUID) (map[uuid.UUID][]uuid.UUID, error)

	// CountUserCasesCompleted counts how many cases a specific user has completed in a cohort.
	CountUserCasesCompleted(ctx context.Context, cohortID, userID uuid.UUID) (int, error)
}

// ============================================================================
// No-Op Implementations (for when database is not configured)
// ============================================================================

// NoOpCohortRepository is a no-op implementation for when DB is not configured.
type NoOpCohortRepository struct{}

// NewNoOpCohortRepository creates a no-op cohort repository.
func NewNoOpCohortRepository() *NoOpCohortRepository {
	return &NoOpCohortRepository{}
}

func (r *NoOpCohortRepository) Create(_ context.Context, _ *domain.StudyCohort) error {
	return nil
}

func (r *NoOpCohortRepository) GetByID(_ context.Context, _ uuid.UUID) (*domain.StudyCohort, error) {
	return nil, nil
}

func (r *NoOpCohortRepository) Update(_ context.Context, _ *domain.StudyCohort) error {
	return nil
}

func (r *NoOpCohortRepository) Delete(_ context.Context, _ uuid.UUID) error {
	return nil
}

func (r *NoOpCohortRepository) List(_ context.Context, _ *domain.CohortStatus, _, _ int) ([]domain.StudyCohort, int64, error) {
	return []domain.StudyCohort{}, 0, nil
}

func (r *NoOpCohortRepository) AddCase(_ context.Context, _, _ uuid.UUID, _ int) error {
	return nil
}

func (r *NoOpCohortRepository) RemoveCase(_ context.Context, _, _ uuid.UUID) error {
	return nil
}

func (r *NoOpCohortRepository) GetCases(_ context.Context, _ uuid.UUID) ([]domain.Study, error) {
	return []domain.Study{}, nil
}

func (r *NoOpCohortRepository) ReorderCases(_ context.Context, _ uuid.UUID, _ []uuid.UUID) error {
	return nil
}

func (r *NoOpCohortRepository) GetCohortByStudyID(_ context.Context, _ uuid.UUID) (*domain.StudyCohort, error) {
	return nil, nil
}

func (r *NoOpCohortRepository) GetNextCaseOrder(_ context.Context, _ uuid.UUID) (int, error) {
	return 0, nil
}

func (r *NoOpCohortRepository) AddUser(_ context.Context, _, _ uuid.UUID, _ string) error {
	return nil
}

func (r *NoOpCohortRepository) RemoveUser(_ context.Context, _, _ uuid.UUID) error {
	return nil
}

func (r *NoOpCohortRepository) GetUsers(_ context.Context, _ uuid.UUID) ([]domain.CohortUser, error) {
	return []domain.CohortUser{}, nil
}

func (r *NoOpCohortRepository) HasAccess(_ context.Context, _, _ uuid.UUID) (bool, error) {
	return false, nil
}

func (r *NoOpCohortRepository) GetRaterProgress(_ context.Context, _ uuid.UUID) ([]domain.RaterProgress, error) {
	return []domain.RaterProgress{}, nil
}

func (r *NoOpCohortRepository) UpdateUserProgress(_ context.Context, _, _ uuid.UUID, _ int) error {
	return nil
}

func (r *NoOpCohortRepository) Activate(_ context.Context, _ uuid.UUID) error {
	return nil
}

func (r *NoOpCohortRepository) Close(_ context.Context, _ uuid.UUID) error {
	return nil
}

func (r *NoOpCohortRepository) UpdateCounters(_ context.Context, _ uuid.UUID) error {
	return nil
}

// NoOpCohortResponseRepository is a no-op implementation for when DB is not configured.
type NoOpCohortResponseRepository struct{}

// NewNoOpCohortResponseRepository creates a no-op cohort response repository.
func NewNoOpCohortResponseRepository() *NoOpCohortResponseRepository {
	return &NoOpCohortResponseRepository{}
}

func (r *NoOpCohortResponseRepository) GetAllByCohort(_ context.Context, _ uuid.UUID) (map[uuid.UUID][]domain.StudyResponse, error) {
	return make(map[uuid.UUID][]domain.StudyResponse), nil
}

func (r *NoOpCohortResponseRepository) GetCompleteRaterResponses(_ context.Context, _ uuid.UUID) (map[uuid.UUID][]domain.StudyResponse, error) {
	return make(map[uuid.UUID][]domain.StudyResponse), nil
}

func (r *NoOpCohortResponseRepository) CountUniqueRaters(_ context.Context, _ uuid.UUID) (int64, error) {
	return 0, nil
}

func (r *NoOpCohortResponseRepository) CountCompleteRaters(_ context.Context, _ uuid.UUID) (int64, error) {
	return 0, nil
}

func (r *NoOpCohortResponseRepository) GetRaterCaseCompletion(_ context.Context, _ uuid.UUID) (map[uuid.UUID][]uuid.UUID, error) {
	return make(map[uuid.UUID][]uuid.UUID), nil
}

func (r *NoOpCohortResponseRepository) CountUserCasesCompleted(_ context.Context, _, _ uuid.UUID) (int, error) {
	return 0, nil
}
