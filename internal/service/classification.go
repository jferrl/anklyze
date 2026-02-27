package service

import (
	"context"
	"log/slog"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/repository"
	"github.com/jferrl/anklyze/internal/rules"
)

// ClassificationAuditRepository defines the audit persistence interface needed by ClassificationService.
// Defined locally to avoid import cycles with the api package.
type ClassificationAuditRepository interface {
	Save(ctx context.Context, entry *domain.AuditEntry) error
}

// ClassificationCache defines the pluggable cache interface for classification results.
// The default implementation is a no-op; a real cache will be introduced in Phase 6.
type ClassificationCache interface {
	Get(ctx context.Context, input domain.FractureInput) (*domain.ClassificationResult, bool)
	Set(ctx context.Context, input domain.FractureInput, result *domain.ClassificationResult)
}

// noOpCache is the default no-op cache implementation.
type noOpCache struct{}

func (noOpCache) Get(_ context.Context, _ domain.FractureInput) (*domain.ClassificationResult, bool) {
	return nil, false
}

func (noOpCache) Set(_ context.Context, _ domain.FractureInput, _ *domain.ClassificationResult) {}

// ClassificationService wraps the rules engine with a service boundary providing
// caching (pluggable, no-op in Phase 3) and service-level audit logging.
// All classification calls route through this service.
type ClassificationService interface {
	// Classify classifies a fracture input and returns the classification result.
	// Results may be served from cache. HTTP-level audit logging stays in the handler.
	Classify(ctx context.Context, input domain.FractureInput) (*domain.ClassificationResult, error)

	// ClassifyAndSave classifies a fracture input and persists the response to the repository.
	// Used by the response submission path where persistence is required.
	ClassifyAndSave(ctx context.Context, input domain.FractureInput, caseID, userID uuid.UUID, timeTakenMS int64, tracking *domain.AnswerTracking) (*domain.CaseResponse, error)
}

// classificationService implements ClassificationService.
type classificationService struct {
	engine       *rules.Engine
	responseRepo repository.CaseResponseRepository
	cache        ClassificationCache
}

// NewClassificationService creates a ClassificationService wrapping the provided engine.
// It uses a no-op cache by default; inject a real cache in Phase 6.
func NewClassificationService(engine *rules.Engine, responseRepo repository.CaseResponseRepository) ClassificationService {
	return &classificationService{
		engine:       engine,
		responseRepo: responseRepo,
		cache:        noOpCache{},
	}
}

// Classify classifies the given fracture input, checking the cache first.
// It passes the input verbatim to the rule engine without modification.
func (s *classificationService) Classify(ctx context.Context, input domain.FractureInput) (*domain.ClassificationResult, error) {
	if cached, ok := s.cache.Get(ctx, input); ok {
		slog.Info("classification served from cache")
		return cached, nil
	}

	result, err := s.engine.Classify(input)
	if err != nil {
		return nil, err
	}

	s.cache.Set(ctx, input, result)

	slog.Info("classification completed",
		"fracture_type", result.FractureType,
		"impossible", result.Impossible,
	)

	return result, nil
}

// ClassifyAndSave classifies the input and persists the response.
// It always calls the engine directly (skips cache) to ensure fresh results are saved.
func (s *classificationService) ClassifyAndSave(
	ctx context.Context,
	input domain.FractureInput,
	caseID, userID uuid.UUID,
	timeTakenMS int64,
	tracking *domain.AnswerTracking,
) (*domain.CaseResponse, error) {
	result, err := s.engine.Classify(input)
	if err != nil {
		return nil, err
	}

	response, err := domain.NewCaseResponseWithTracking(caseID, userID, *result, timeTakenMS, tracking)
	if err != nil {
		return nil, err
	}

	if err := s.responseRepo.Save(ctx, response); err != nil {
		return nil, err
	}

	slog.Info("classification saved",
		"case_id", caseID,
		"user_id", userID,
		"fracture_type", result.FractureType,
	)

	return response, nil
}
