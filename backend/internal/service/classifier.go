package service

import (
	"github.com/jferrl/fratures/internal/domain"
	"github.com/jferrl/fratures/internal/i18n"
	"github.com/jferrl/fratures/internal/rules"
)

// ClassifierService defines the interface for fracture classification
type ClassifierService interface {
	Classify(input domain.FractureInput, lang i18n.Language) (*domain.ClassificationResult, error)
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
func (s *classifierService) Classify(input domain.FractureInput, lang i18n.Language) (*domain.ClassificationResult, error) {
	return s.engine.Classify(input, lang)
}
