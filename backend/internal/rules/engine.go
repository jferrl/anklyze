package rules

import (
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/i18n"
)

// Engine is the rule engine that classifies ankle fractures
type Engine struct{}

// NewEngine creates a new rule engine
func NewEngine() *Engine {
	return &Engine{}
}

// Classify applies the classification rules based on the decision tree from the flow diagram
func (e *Engine) Classify(input domain.FractureInput, lang i18n.Language) (*domain.ClassificationResult, error) {
	switch input.InvolvedMalleoli {
	case domain.InvolvedPosteriorOnly:
		return e.classifyPosteriorOnly(input, lang)
	case domain.InvolvedMedialOnly:
		return e.classifyMedialOnly(input, lang)
	case domain.InvolvedLateralOnly:
		return e.classifyLateralOnly(input, lang)
	case domain.InvolvedMedialPosterior:
		return e.classifyMedialPosterior(lang)
	case domain.InvolvedLateralPosterior:
		return e.classifyLateralPosterior(input, lang)
	case domain.InvolvedLateralMedial:
		return e.classifyLateralMedial(input, lang)
	case domain.InvolvedTrimaleolar:
		return e.classifyTrimaleolar(input, lang)
	}

	return &domain.ClassificationResult{
		FractureDescription: i18n.T(lang, i18n.KeyNoFractureSelected),
	}, nil
}

// classifyPosteriorOnly handles posterior malleolus only fractures
func (e *Engine) classifyPosteriorOnly(input domain.FractureInput, lang i18n.Language) (*domain.ClassificationResult, error) {
	bartonicek := getBartonicekFromPosteriorType(input.PosteriorFractureType, lang)

	return &domain.ClassificationResult{
		FractureDescription: i18n.T(lang, i18n.KeyFractureUnimaleolarPosterior),
		AOOTA: &domain.AOOTAClassification{
			Code:        domain.AOOTAB3,
			Description: i18n.T(lang, i18n.KeyAOB3Desc),
		},
		LaugeHansen: &domain.LaugeHansenClassification{
			Type:        domain.LaugeHansenSER,
			FullName:    i18n.T(lang, i18n.KeyLHSERName),
			Description: i18n.T(lang, i18n.KeyLHSERDesc),
		},
		Bartonicek: bartonicek,
	}, nil
}

// classifyMedialOnly handles medial malleolus only fractures
func (e *Engine) classifyMedialOnly(input domain.FractureInput, lang i18n.Language) (*domain.ClassificationResult, error) {
	result := &domain.ClassificationResult{
		FractureDescription: i18n.T(lang, i18n.KeyFractureUnimaleolarMedial),
		AOOTA: &domain.AOOTAClassification{
			Code:        domain.AOOTAA1,
			Description: i18n.T(lang, i18n.KeyAOA1Desc),
		},
	}

	if input.MedialMorphology == domain.MedialMorphologyOblique {
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Type:        domain.LaugeHansenSA,
			FullName:    i18n.T(lang, i18n.KeyLHSAName),
			Description: i18n.T(lang, i18n.KeyLHSADesc),
		}
	} else {
		// Transverse
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Type:          domain.LaugeHansenPA,
			FullName:      i18n.T(lang, i18n.KeyLHAmbiguousName),
			Description:   i18n.T(lang, i18n.KeyLHAmbiguousDesc),
			Ambiguous:     true,
			PossibleTypes: []string{"PA", "SER", "PER"},
		}
	}

	return result, nil
}

// classifyLateralOnly handles lateral malleolus only fractures
func (e *Engine) classifyLateralOnly(input domain.FractureInput, lang i18n.Language) (*domain.ClassificationResult, error) {
	result := &domain.ClassificationResult{
		FractureDescription: i18n.T(lang, i18n.KeyFractureUnimaleolarLateral),
	}

	switch input.FibularLevel {
	case domain.FibularLevelInfrasindesmal:
		result.DanisWeber = &domain.DanisWeberClassification{
			Type:        domain.DanisWeberA,
			Description: i18n.T(lang, i18n.KeyDWADesc),
		}
		result.AOOTA = &domain.AOOTAClassification{
			Code:        domain.AOOTAA1,
			Description: i18n.T(lang, i18n.KeyAOA1Desc),
		}
		if input.LateralMorphology == domain.LateralMorphologyTransverse {
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type:        domain.LaugeHansenSA,
				FullName:    i18n.T(lang, i18n.KeyLHSAName),
				Description: i18n.T(lang, i18n.KeyLHSADesc),
			}
		} else {
			// Oblique
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type:        domain.LaugeHansenPA,
				FullName:    i18n.T(lang, i18n.KeyLHPAName),
				Description: i18n.T(lang, i18n.KeyLHPADesc),
			}
		}

	case domain.FibularLevelTransindesmal:
		result.DanisWeber = &domain.DanisWeberClassification{
			Type:        domain.DanisWeberB,
			Description: i18n.T(lang, i18n.KeyDWBDesc),
		}
		result.AOOTA = &domain.AOOTAClassification{
			Code:        domain.AOOTAB1,
			Description: i18n.T(lang, i18n.KeyAOB1Desc),
		}
		if input.LateralMorphology == domain.LateralMorphologySpiral {
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type:        domain.LaugeHansenSER,
				FullName:    i18n.T(lang, i18n.KeyLHSERName),
				Description: i18n.T(lang, i18n.KeyLHSERDesc),
			}
		} else {
			// Oblique
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type:        domain.LaugeHansenPA,
				FullName:    i18n.T(lang, i18n.KeyLHPAName),
				Description: i18n.T(lang, i18n.KeyLHPADesc),
			}
		}

	case domain.FibularLevelSuprasindesmal:
		result.DanisWeber = &domain.DanisWeberClassification{
			Type:        domain.DanisWeberC,
			Description: i18n.T(lang, i18n.KeyDWCDesc),
		}
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Type:        domain.LaugeHansenPER,
			FullName:    i18n.T(lang, i18n.KeyLHPERName),
			Description: i18n.T(lang, i18n.KeyLHPERDesc),
		}
		result.AOOTA = getAOOTAForSuprasindesmal(input.SuprasindesmalType, lang)
	}

	return result, nil
}

// classifyMedialPosterior handles medial + posterior fractures
func (e *Engine) classifyMedialPosterior(lang i18n.Language) (*domain.ClassificationResult, error) {
	return &domain.ClassificationResult{
		FractureDescription: i18n.T(lang, i18n.KeyFractureBimaleolarMedialPosterior),
		AOOTA: &domain.AOOTAClassification{
			Code:        domain.AOOTAB3,
			Description: i18n.T(lang, i18n.KeyAOB3Desc),
		},
		LaugeHansen: &domain.LaugeHansenClassification{
			Type:        domain.LaugeHansenSER,
			FullName:    i18n.T(lang, i18n.KeyLHSERName),
			Description: i18n.T(lang, i18n.KeyLHSERDesc),
		},
	}, nil
}

// classifyLateralPosterior handles lateral + posterior fractures
func (e *Engine) classifyLateralPosterior(input domain.FractureInput, lang i18n.Language) (*domain.ClassificationResult, error) {
	result := &domain.ClassificationResult{
		FractureDescription: i18n.T(lang, i18n.KeyFractureBimaleolarLateralPosterior),
	}

	switch input.FibularLevel {
	case domain.FibularLevelInfrasindesmal:
		if input.LateralMorphology == domain.LateralMorphologyTransverse {
			return &domain.ClassificationResult{
				FractureDescription: i18n.T(lang, i18n.KeyFractureBimaleolarLateralPosterior),
				Impossible:          true,
				ImpossibleReason:    i18n.T(lang, i18n.KeyNotPossibleSAMechanism),
			}, nil
		}
		// Oblique
		result.DanisWeber = &domain.DanisWeberClassification{
			Type:        domain.DanisWeberA,
			Description: i18n.T(lang, i18n.KeyDWADesc),
		}
		result.AOOTA = &domain.AOOTAClassification{
			Code:        domain.AOOTAA2,
			Description: i18n.T(lang, i18n.KeyAOA2Desc),
		}
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Type:        domain.LaugeHansenPA,
			FullName:    i18n.T(lang, i18n.KeyLHPAName),
			Description: i18n.T(lang, i18n.KeyLHPADesc),
		}
		result.Bartonicek = getBartonicekFromPosteriorType(input.PosteriorFractureType, lang)

	case domain.FibularLevelTransindesmal:
		result.DanisWeber = &domain.DanisWeberClassification{
			Type:        domain.DanisWeberB,
			Description: i18n.T(lang, i18n.KeyDWBDesc),
		}
		result.AOOTA = &domain.AOOTAClassification{
			Code:        domain.AOOTAB3,
			Description: i18n.T(lang, i18n.KeyAOB3Desc),
		}
		if input.LateralMorphology == domain.LateralMorphologySpiral {
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type:        domain.LaugeHansenSER,
				FullName:    i18n.T(lang, i18n.KeyLHSERName),
				Description: i18n.T(lang, i18n.KeyLHSERDesc),
			}
		} else {
			// Oblique
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type:        domain.LaugeHansenPA,
				FullName:    i18n.T(lang, i18n.KeyLHPAName),
				Description: i18n.T(lang, i18n.KeyLHPADesc),
			}
		}
		result.Bartonicek = getBartonicekFromPosteriorType(input.PosteriorFractureType, lang)

	case domain.FibularLevelSuprasindesmal:
		result.DanisWeber = &domain.DanisWeberClassification{
			Type:        domain.DanisWeberC,
			Description: i18n.T(lang, i18n.KeyDWCDesc),
		}
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Type:        domain.LaugeHansenPER,
			FullName:    i18n.T(lang, i18n.KeyLHPERName),
			Description: i18n.T(lang, i18n.KeyLHPERDesc),
		}
		result.AOOTA = getAOOTAForSuprasindesmalBimaleolar(input.SuprasindesmalType, lang)
		result.Bartonicek = getBartonicekFromPosteriorType(input.PosteriorFractureType, lang)
	}

	return result, nil
}

// classifyLateralMedial handles lateral + medial fractures
func (e *Engine) classifyLateralMedial(input domain.FractureInput, lang i18n.Language) (*domain.ClassificationResult, error) {
	result := &domain.ClassificationResult{
		FractureDescription: i18n.T(lang, i18n.KeyFractureBimaleolarLateralMedial),
	}

	// Path: Oblique medial + infrasindesmal transverse fibula
	if input.MedialMorphology == domain.MedialMorphologyOblique &&
		input.FibulaInfrasindesmalTransverse != nil && *input.FibulaInfrasindesmalTransverse {
		result.DanisWeber = &domain.DanisWeberClassification{
			Type:        domain.DanisWeberA,
			Description: i18n.T(lang, i18n.KeyDWADesc),
		}
		result.AOOTA = &domain.AOOTAClassification{
			Code:        domain.AOOTAA2,
			Description: i18n.T(lang, i18n.KeyAOA2Desc),
		}
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Type:        domain.LaugeHansenSA,
			FullName:    i18n.T(lang, i18n.KeyLHSAName),
			Description: i18n.T(lang, i18n.KeyLHSADesc),
		}
		return result, nil
	}

	// Path: High (suprasindesmal)
	if input.FibularLevelForTransverse == domain.FibularLevelSuprasindesmal {
		result.DanisWeber = &domain.DanisWeberClassification{
			Type:        domain.DanisWeberC,
			Description: i18n.T(lang, i18n.KeyDWCDesc),
		}
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Type:        domain.LaugeHansenPER,
			FullName:    i18n.T(lang, i18n.KeyLHPERName),
			Description: i18n.T(lang, i18n.KeyLHPERDesc),
		}
		result.AOOTA = getAOOTAForSuprasindesmalBimaleolar(input.SuprasindesmalType, lang)
		return result, nil
	}

	// Path: Low - check morphology
	switch input.LateralMorphology {
	case domain.LateralMorphologyTransverse:
		// Need to check fibular level
		if input.FibularLevel == domain.FibularLevelInfrasindesmal {
			result.DanisWeber = &domain.DanisWeberClassification{
				Type:        domain.DanisWeberA,
				Description: i18n.T(lang, i18n.KeyDWADesc),
			}
			result.AOOTA = &domain.AOOTAClassification{
				Code:        domain.AOOTAA2,
				Description: i18n.T(lang, i18n.KeyAOA2Desc),
			}
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type:        domain.LaugeHansenSA,
				FullName:    i18n.T(lang, i18n.KeyLHSAName),
				Description: i18n.T(lang, i18n.KeyLHSADesc),
			}
		} else {
			// Transindesmal
			result.DanisWeber = &domain.DanisWeberClassification{
				Type:        domain.DanisWeberB,
				Description: i18n.T(lang, i18n.KeyDWBDesc),
			}
			result.AOOTA = &domain.AOOTAClassification{
				Code:        domain.AOOTAB2,
				Description: i18n.T(lang, i18n.KeyAOB2Desc),
			}
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type:        domain.LaugeHansenPA,
				FullName:    i18n.T(lang, i18n.KeyLHPAName),
				Description: i18n.T(lang, i18n.KeyLHPADesc),
			}
		}

	case domain.LateralMorphologyOblique:
		result.DanisWeber = &domain.DanisWeberClassification{
			Type:        domain.DanisWeberB,
			Description: i18n.T(lang, i18n.KeyDWBDesc),
		}
		result.AOOTA = &domain.AOOTAClassification{
			Code:        domain.AOOTAB2,
			Description: i18n.T(lang, i18n.KeyAOB2Desc),
		}
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Type:        domain.LaugeHansenPA,
			FullName:    i18n.T(lang, i18n.KeyLHPAName),
			Description: i18n.T(lang, i18n.KeyLHPADesc),
		}

	case domain.LateralMorphologySpiral:
		result.DanisWeber = &domain.DanisWeberClassification{
			Type:        domain.DanisWeberB,
			Description: i18n.T(lang, i18n.KeyDWBDesc),
		}
		result.AOOTA = &domain.AOOTAClassification{
			Code:        domain.AOOTAB2,
			Description: i18n.T(lang, i18n.KeyAOB2Desc),
		}
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Type:        domain.LaugeHansenSER,
			FullName:    i18n.T(lang, i18n.KeyLHSERName),
			Description: i18n.T(lang, i18n.KeyLHSERDesc),
		}
	}

	return result, nil
}

// classifyTrimaleolar handles trimaleolar fractures
func (e *Engine) classifyTrimaleolar(input domain.FractureInput, lang i18n.Language) (*domain.ClassificationResult, error) {
	result := &domain.ClassificationResult{
		FractureDescription: i18n.T(lang, i18n.KeyFractureTrimaleolar),
	}

	// Path: High (suprasindesmal)
	if input.FibularLevel == domain.FibularLevelSuprasindesmal {
		result.DanisWeber = &domain.DanisWeberClassification{
			Type:        domain.DanisWeberC,
			Description: i18n.T(lang, i18n.KeyDWCDesc),
		}
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Type:        domain.LaugeHansenPER,
			FullName:    i18n.T(lang, i18n.KeyLHPERName),
			Description: i18n.T(lang, i18n.KeyLHPERDesc),
		}
		result.AOOTA = getAOOTAForSuprasindesmalTrimaleolar(input.SuprasindesmalType, lang)
		return result, nil
	}

	// Path: Low - check morphology
	switch input.LateralMorphology {
	case domain.LateralMorphologyTransverse:
		// Need to check fibular level
		if input.FibularLevelForTransverse == domain.FibularLevelInfrasindesmal {
			return &domain.ClassificationResult{
				FractureDescription: i18n.T(lang, i18n.KeyFractureTrimaleolar),
				Impossible:          true,
				ImpossibleReason:    i18n.T(lang, i18n.KeyNotPossibleExceptional),
			}, nil
		}
		// Transindesmal
		result.DanisWeber = &domain.DanisWeberClassification{
			Type:        domain.DanisWeberB,
			Description: i18n.T(lang, i18n.KeyDWBDesc),
		}
		result.AOOTA = &domain.AOOTAClassification{
			Code:        domain.AOOTAB3,
			Description: i18n.T(lang, i18n.KeyAOB3Desc),
		}
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Type:        domain.LaugeHansenPA,
			FullName:    i18n.T(lang, i18n.KeyLHPAName),
			Description: i18n.T(lang, i18n.KeyLHPADesc),
		}

	case domain.LateralMorphologyOblique:
		result.DanisWeber = &domain.DanisWeberClassification{
			Type:        domain.DanisWeberB,
			Description: i18n.T(lang, i18n.KeyDWBDesc),
		}
		result.AOOTA = &domain.AOOTAClassification{
			Code:        domain.AOOTAB3,
			Description: i18n.T(lang, i18n.KeyAOB3Desc),
		}
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Type:        domain.LaugeHansenPA,
			FullName:    i18n.T(lang, i18n.KeyLHPAName),
			Description: i18n.T(lang, i18n.KeyLHPADesc),
		}

	case domain.LateralMorphologySpiral:
		result.DanisWeber = &domain.DanisWeberClassification{
			Type:        domain.DanisWeberB,
			Description: i18n.T(lang, i18n.KeyDWBDesc),
		}
		result.AOOTA = &domain.AOOTAClassification{
			Code:        domain.AOOTAB3,
			Description: i18n.T(lang, i18n.KeyAOB3Desc),
		}
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Type:        domain.LaugeHansenSER,
			FullName:    i18n.T(lang, i18n.KeyLHSERName),
			Description: i18n.T(lang, i18n.KeyLHSERDesc),
		}
	}

	return result, nil
}

// Helper functions

func getBartonicekFromPosteriorType(pt domain.PosteriorFractureType, lang i18n.Language) *domain.BartonicekClassification {
	switch pt {
	case domain.PosteriorExtraincisural:
		return &domain.BartonicekClassification{
			Type:        domain.BartonicekType1,
			Description: i18n.T(lang, i18n.KeyBart1Desc),
		}
	case domain.PosteriorPosterolateral:
		return &domain.BartonicekClassification{
			Type:        domain.BartonicekType2,
			Description: i18n.T(lang, i18n.KeyBart2Desc),
		}
	case domain.PosteriorPosteromedialPosterolateral:
		return &domain.BartonicekClassification{
			Type:        domain.BartonicekType3,
			Description: i18n.T(lang, i18n.KeyBart3Desc),
		}
	case domain.PosteriorLargePosterolateral:
		return &domain.BartonicekClassification{
			Type:        domain.BartonicekType4,
			Description: i18n.T(lang, i18n.KeyBart4Desc),
		}
	}
	return nil
}

func getAOOTAForSuprasindesmal(st domain.SuprasindesmalType, lang i18n.Language) *domain.AOOTAClassification {
	switch st {
	case domain.SuprasindesmalSimpleDiaphyseal:
		return &domain.AOOTAClassification{
			Code:        domain.AOOTAC1,
			Description: i18n.T(lang, i18n.KeyAOC1Desc),
		}
	case domain.SuprasindesmalMultifragmentary:
		return &domain.AOOTAClassification{
			Code:        domain.AOOTAC2,
			Description: i18n.T(lang, i18n.KeyAOC2Desc),
		}
	case domain.SuprasindesmalProximal:
		return &domain.AOOTAClassification{
			Code:        domain.AOOTAC3,
			Description: i18n.T(lang, i18n.KeyAOC3Desc),
		}
	}
	return &domain.AOOTAClassification{
		Code:        domain.AOOTAC1,
		Description: i18n.T(lang, i18n.KeyAOC1Desc),
	}
}

func getAOOTAForSuprasindesmalBimaleolar(st domain.SuprasindesmalType, lang i18n.Language) *domain.AOOTAClassification {
	switch st {
	case domain.SuprasindesmalSimpleDiaphyseal:
		return &domain.AOOTAClassification{
			Code:        domain.AOOTAC1,
			Description: i18n.T(lang, i18n.KeyAOC1Desc),
		}
	case domain.SuprasindesmalMultifragmentary:
		return &domain.AOOTAClassification{
			Code:        domain.AOOTAC2,
			Description: i18n.T(lang, i18n.KeyAOC2Desc),
		}
	case domain.SuprasindesmalProximal:
		return &domain.AOOTAClassification{
			Code:        domain.AOOTAC3,
			Description: i18n.T(lang, i18n.KeyAOC3Desc),
		}
	}
	return &domain.AOOTAClassification{
		Code:        domain.AOOTAC1,
		Description: i18n.T(lang, i18n.KeyAOC1Desc),
	}
}

func getAOOTAForSuprasindesmalTrimaleolar(st domain.SuprasindesmalType, lang i18n.Language) *domain.AOOTAClassification {
	switch st {
	case domain.SuprasindesmalSimpleDiaphyseal:
		return &domain.AOOTAClassification{
			Code:        domain.AOOTAC1,
			Description: i18n.T(lang, i18n.KeyAOC1Desc),
		}
	case domain.SuprasindesmalMultifragmentary:
		return &domain.AOOTAClassification{
			Code:        domain.AOOTAC2,
			Description: i18n.T(lang, i18n.KeyAOC2Desc),
		}
	case domain.SuprasindesmalProximal:
		return &domain.AOOTAClassification{
			Code:        domain.AOOTAC3,
			Description: i18n.T(lang, i18n.KeyAOC3Desc),
		}
	}
	return &domain.AOOTAClassification{
		Code:        domain.AOOTAC1,
		Description: i18n.T(lang, i18n.KeyAOC1Desc),
	}
}
