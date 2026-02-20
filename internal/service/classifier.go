package service

import (
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/rules"
)

// ClassifierService defines the interface for fracture classification
type ClassifierService interface {
	Classify(input domain.FractureInput) (*domain.ClassificationResult, error)
}

// classifierService implements ClassifierService
type classifierService struct {
	engine *rules.Engine
}

// NewClassifierService creates a new ClassifierService
func NewClassifierService(engine *rules.Engine) ClassifierService {
	return &classifierService{engine: engine}
}

// Classify classifies a fracture based on the input
func (s *classifierService) Classify(input domain.FractureInput) (*domain.ClassificationResult, error) {
	return s.engine.Classify(input)
}
