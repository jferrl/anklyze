package rules

import (
	"github.com/jferrl/anklyze/internal/domain"
)

// Engine is the rule engine that classifies ankle fractures
type Engine struct{}

// NewEngine creates a new rule engine
func NewEngine() *Engine {
	return &Engine{}
}

// Classify applies the classification rules based on the decision tree from the flow diagram
func (e *Engine) Classify(input domain.FractureInput) (*domain.ClassificationResult, error) {
	switch input.InvolvedMalleoli {
	case domain.InvolvedPosteriorOnly:
		return e.classifyPosteriorOnly(input)
	case domain.InvolvedMedialOnly:
		return e.classifyMedialOnly(input)
	case domain.InvolvedLateralOnly:
		return e.classifyLateralOnly(input)
	case domain.InvolvedMedialPosterior:
		return e.classifyMedialPosterior(input)
	case domain.InvolvedLateralPosterior:
		return e.classifyLateralPosterior(input)
	case domain.InvolvedLateralMedial:
		return e.classifyLateralMedial(input)
	case domain.InvolvedTrimaleolar:
		return e.classifyTrimaleolar(input)
	}

	return &domain.ClassificationResult{
		FractureType: "none_selected",
	}, nil
}

// classifyPosteriorOnly handles posterior malleolus only fractures
func (e *Engine) classifyPosteriorOnly(input domain.FractureInput) (*domain.ClassificationResult, error) {
	if input.ArticularInvolvement == domain.ArticularLargeWithExtension {
		aoCode := domain.AOOTA43B1
		if input.HasArticularDepression != nil && *input.HasArticularDepression {
			aoCode = domain.AOOTA43B2
		}
		return &domain.ClassificationResult{
			FractureType: "distal_tibia",
			AOOTA: &domain.AOOTAClassification{
				Code: aoCode,
			},
		}, nil
	}

	// <1/3 without metaphyseal extension: AO unclassifiable, LH PA, Bartonicek from CT
	result := &domain.ClassificationResult{
		FractureType: "unimaleolar_posterior",
		LaugeHansen: &domain.LaugeHansenClassification{
			Type: domain.LaugeHansenPA,
		},
	}

	if input.HasCTScan != nil && *input.HasCTScan {
		result.Bartonicek = getBartonicekFromPosteriorType(input.PosteriorFractureType)
	}

	return result, nil
}

// classifyMedialOnly handles medial malleolus only fractures
func (e *Engine) classifyMedialOnly(input domain.FractureInput) (*domain.ClassificationResult, error) {
	if input.ArticularInvolvement == domain.ArticularLargeWithExtension {
		aoCode := domain.AOOTA43B1
		if input.HasArticularDepression != nil && *input.HasArticularDepression {
			aoCode = domain.AOOTA43B2
		}
		return &domain.ClassificationResult{
			FractureType: "distal_tibia",
			AOOTA: &domain.AOOTAClassification{
				Code: aoCode,
			},
		}, nil
	}

	// <1/3 without metaphyseal extension: morphology path
	result := &domain.ClassificationResult{
		FractureType: "unimaleolar_medial",
		AOOTA: &domain.AOOTAClassification{
			Code: domain.AOOTAA2,
		},
	}

	if input.MedialMorphology == domain.MedialMorphologyVertical {
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Type: domain.LaugeHansenSA,
		}
	} else {
		// Transverse/oblique - ambiguous, could be PA, SER, or PER
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Ambiguous:     true,
			PossibleTypes: []string{"PA", "SER", "PER"},
		}
	}

	return result, nil
}

// classifyLateralOnly handles lateral malleolus only fractures
func (e *Engine) classifyLateralOnly(input domain.FractureInput) (*domain.ClassificationResult, error) {
	result := &domain.ClassificationResult{
		FractureType: "unimaleolar_lateral",
	}

	switch input.FibularLevel {
	case domain.FibularLevelInfrasindesmal:
		// Infrasindesmal lateral-only always results in SA (no morphology question needed)
		result.DanisWeber = &domain.DanisWeberClassification{
			Type: domain.DanisWeberA,
		}
		result.AOOTA = &domain.AOOTAClassification{
			Code: domain.AOOTAA1,
		}
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Type: domain.LaugeHansenSA,
		}

	case domain.FibularLevelTransindesmal:
		result.DanisWeber = &domain.DanisWeberClassification{
			Type: domain.DanisWeberB,
		}
		result.AOOTA = &domain.AOOTAClassification{
			Code: domain.AOOTAB,
		}
		if input.LateralMorphology == domain.LateralMorphologySpiral {
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type: domain.LaugeHansenSER,
			}
		} else {
			// Oblique
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type: domain.LaugeHansenPA,
			}
		}

	case domain.FibularLevelSuprasindesmal:
		result.DanisWeber = &domain.DanisWeberClassification{
			Type: domain.DanisWeberC,
		}

		// For simple diaphyseal and multifragmentary, use fibula trace pattern to determine PA vs PER
		// Proximal is always PER
		if input.SuprasindesmalType == domain.SuprasindesmalProximal {
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type: domain.LaugeHansenPER,
			}
		} else if input.FibulaTracePattern == domain.FibulaTraceParasindesmoticShort {
			// Parasyndesmotic short oblique/transverse/comminuted → PA
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type: domain.LaugeHansenPA,
			}
		} else {
			// Parasyndesmotic or suprasyndesmotic long oblique/spiral → PER (default)
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type: domain.LaugeHansenPER,
			}
		}
		result.AOOTA = getAOOTAForSuprasindesmal(input.SuprasindesmalType)
	}

	return result, nil
}

// classifyMedialPosterior handles medial + posterior fractures
func (e *Engine) classifyMedialPosterior(input domain.FractureInput) (*domain.ClassificationResult, error) {
	result := &domain.ClassificationResult{
		FractureType: "bimaleolar_medial_posterior",
	}

	if input.HasCTScan == nil || !*input.HasCTScan {
		// No CT → AO unclassifiable, LH PA
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Type: domain.LaugeHansenPA,
		}
		return result, nil
	}

	// CT available → branch on posterior fragment type
	if input.PosteriorFractureType == domain.PosteriorExtraincisuralPosteromedial {
		result.AOOTA = &domain.AOOTAClassification{
			Code: domain.AOOTAA3,
		}
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Ambiguous:          true,
			AmbiguousReasonKey: "medial_posterior_extraincisural",
		}
		return result, nil
	}

	// Standard 4 posterior types → AO 44-B3 + LH PA + Bartonicek
	result.AOOTA = &domain.AOOTAClassification{
		Code: domain.AOOTAB3,
	}
	result.LaugeHansen = &domain.LaugeHansenClassification{
		Type: domain.LaugeHansenPA,
	}
	result.Bartonicek = getBartonicekFromPosteriorType(input.PosteriorFractureType)

	return result, nil
}

// classifyLateralPosterior handles lateral + posterior fractures
func (e *Engine) classifyLateralPosterior(input domain.FractureInput) (*domain.ClassificationResult, error) {
	result := &domain.ClassificationResult{
		FractureType: "bimaleolar_lateral_posterior",
	}

	switch input.FibularLevel {
	case domain.FibularLevelInfrasindesmal:
		result.DanisWeber = &domain.DanisWeberClassification{
			Type: domain.DanisWeberA,
		}

		if input.HasCTScan == nil || !*input.HasCTScan {
			// No CT → AO unclassifiable (nil), LH unclassifiable, Weber A
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Ambiguous:          true,
				AmbiguousReasonKey: "lateral_posterior_infrasindesmal",
			}
			return result, nil
		}

		if input.IsPosteriorPosteromedial != nil && *input.IsPosteriorPosteromedial {
			result.AOOTA = &domain.AOOTAClassification{
				Code: domain.AOOTAA3,
			}
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Ambiguous:          true,
				AmbiguousReasonKey: "lateral_posterior_infrasindesmal",
			}
		} else {
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Ambiguous:          true,
				AmbiguousReasonKey: "lateral_posterior_infrasindesmal",
			}
			result.Bartonicek = getBartonicekFromPosteriorType(input.PosteriorFractureType)
		}

		return result, nil

	case domain.FibularLevelTransindesmal:
		result.DanisWeber = &domain.DanisWeberClassification{
			Type: domain.DanisWeberB,
		}
		result.AOOTA = &domain.AOOTAClassification{
			Code: domain.AOOTAB3,
		}
		if input.LateralMorphology == domain.LateralMorphologySpiral {
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type: domain.LaugeHansenSER,
			}
		} else {
			// Oblique
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type: domain.LaugeHansenPA,
			}
		}
		// Bartonicek requires CT scan
		if input.HasCTScan != nil && *input.HasCTScan {
			result.Bartonicek = getBartonicekFromPosteriorType(input.PosteriorFractureType)
		}

	case domain.FibularLevelSuprasindesmal:
		result.DanisWeber = &domain.DanisWeberClassification{
			Type: domain.DanisWeberC,
		}

		// For simple diaphyseal and multifragmentary, use fibula trace pattern to determine PA vs PER
		// Proximal is always PER
		if input.SuprasindesmalType == domain.SuprasindesmalProximal {
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type: domain.LaugeHansenPER,
			}
			// Bartonicek requires CT scan
			if input.HasCTScan != nil && *input.HasCTScan {
				result.Bartonicek = getBartonicekFromPosteriorType(input.PosteriorFractureType)
			}
		} else if input.FibulaTracePattern == domain.FibulaTraceParasindesmoticShort {
			// Parasyndesmotic short oblique/transverse/comminuted → PA
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type: domain.LaugeHansenPA,
			}
			// Bartonicek requires CT scan
			if input.HasCTScan != nil && *input.HasCTScan {
				result.Bartonicek = getBartonicekFromPosteriorType(input.PosteriorFractureType)
			}
		} else {
			// Parasyndesmotic or suprasyndesmotic long oblique/spiral → PER (default)
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type: domain.LaugeHansenPER,
			}
			// Bartonicek requires CT scan
			if input.HasCTScan != nil && *input.HasCTScan {
				result.Bartonicek = getBartonicekFromPosteriorType(input.PosteriorFractureType)
			}
		}
		result.AOOTA = getAOOTAForSuprasindesmal(input.SuprasindesmalType)
	}

	return result, nil
}

// classifyLateralMedial handles lateral + medial fractures
func (e *Engine) classifyLateralMedial(input domain.FractureInput) (*domain.ClassificationResult, error) {
	result := &domain.ClassificationResult{
		FractureType: "bimaleolar_lateral_medial",
	}

	// Path: Oblique medial + infrasindesmal transverse fibula
	if input.MedialMorphology == domain.MedialMorphologyVertical &&
		input.FibulaInfrasindesmalTransverse != nil && *input.FibulaInfrasindesmalTransverse {
		result.DanisWeber = &domain.DanisWeberClassification{
			Type: domain.DanisWeberA,
		}
		result.AOOTA = &domain.AOOTAClassification{
			Code: domain.AOOTAA2,
		}
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Type: domain.LaugeHansenSA,
		}
		return result, nil
	}

	// Path: High (suprasindesmal)
	if input.FibularLevel == domain.FibularLevelSuprasindesmal {
		result.DanisWeber = &domain.DanisWeberClassification{
			Type: domain.DanisWeberC,
		}

		// For simple diaphyseal and multifragmentary, use fibula trace pattern to determine PA vs PER
		// Proximal is always PER
		if input.SuprasindesmalType == domain.SuprasindesmalProximal {
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type: domain.LaugeHansenPER,
			}
		} else if input.FibulaTracePattern == domain.FibulaTraceParasindesmoticShort {
			// Parasyndesmotic short oblique/transverse/comminuted → PA
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type: domain.LaugeHansenPA,
			}
		} else {
			// Parasyndesmotic or suprasyndesmotic long oblique/spiral → PER (default)
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type: domain.LaugeHansenPER,
			}
		}
		result.AOOTA = getAOOTAForSuprasindesmal(input.SuprasindesmalType)
		return result, nil
	}

	// Path: Low - check morphology
	switch input.LateralMorphology {
	case domain.LateralMorphologyTransverse:
		// Need to check fibular level for transverse sub-level
		if input.FibularLevelForTransverse == domain.FibularLevelInfrasindesmal {
			result.DanisWeber = &domain.DanisWeberClassification{
				Type: domain.DanisWeberA,
			}
			result.AOOTA = &domain.AOOTAClassification{
				Code: domain.AOOTAA2,
			}
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type: domain.LaugeHansenSA,
			}
		} else {
			// Transindesmal
			result.DanisWeber = &domain.DanisWeberClassification{
				Type: domain.DanisWeberB,
			}
			result.AOOTA = &domain.AOOTAClassification{
				Code: domain.AOOTAB2,
			}
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type: domain.LaugeHansenPA,
			}
		}

	case domain.LateralMorphologyOblique:
		result.DanisWeber = &domain.DanisWeberClassification{
			Type: domain.DanisWeberB,
		}
		result.AOOTA = &domain.AOOTAClassification{
			Code: domain.AOOTAB2,
		}
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Type: domain.LaugeHansenPA,
		}

	case domain.LateralMorphologySpiral:
		result.DanisWeber = &domain.DanisWeberClassification{
			Type: domain.DanisWeberB,
		}
		result.AOOTA = &domain.AOOTAClassification{
			Code: domain.AOOTAB2,
		}
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Type: domain.LaugeHansenSER,
		}
	}

	return result, nil
}

// classifyTrimaleolar handles trimaleolar fractures
func (e *Engine) classifyTrimaleolar(input domain.FractureInput) (*domain.ClassificationResult, error) {
	result := &domain.ClassificationResult{
		FractureType: "trimaleolar",
	}

	// Path: High (suprasindesmal)
	if input.FibularLevel == domain.FibularLevelSuprasindesmal {
		result.DanisWeber = &domain.DanisWeberClassification{
			Type: domain.DanisWeberC,
		}

		// For simple diaphyseal and multifragmentary, use fibula trace pattern to determine PA vs PER
		// Proximal is always PER
		if input.SuprasindesmalType == domain.SuprasindesmalProximal {
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type: domain.LaugeHansenPER,
			}
			// Bartonicek requires CT scan
			if input.HasCTScan != nil && *input.HasCTScan {
				result.Bartonicek = getBartonicekFromPosteriorType(input.PosteriorFractureType)
			}
		} else if input.FibulaTracePattern == domain.FibulaTraceParasindesmoticShort {
			// Parasyndesmotic short oblique/transverse/comminuted → PA
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type: domain.LaugeHansenPA,
			}
			// Bartonicek requires CT scan
			if input.HasCTScan != nil && *input.HasCTScan {
				result.Bartonicek = getBartonicekFromPosteriorType(input.PosteriorFractureType)
			}
		} else {
			// Parasyndesmotic or suprasyndesmotic long oblique/spiral → PER (default)
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type: domain.LaugeHansenPER,
			}
			// Bartonicek requires CT scan
			if input.HasCTScan != nil && *input.HasCTScan {
				result.Bartonicek = getBartonicekFromPosteriorType(input.PosteriorFractureType)
			}
		}
		result.AOOTA = getAOOTAForSuprasindesmal(input.SuprasindesmalType)
		return result, nil
	}

	// Path: Low - check morphology
	switch input.LateralMorphology {
	case domain.LateralMorphologyTransverse:
		// Need to check fibular level
		if input.FibularLevelForTransverse == domain.FibularLevelInfrasindesmal {
			return &domain.ClassificationResult{
				FractureType:  "trimaleolar",
				Impossible:    true,
				ImpossibleKey: "exceptional",
			}, nil
		}
		// Transindesmal
		result.DanisWeber = &domain.DanisWeberClassification{
			Type: domain.DanisWeberB,
		}
		result.AOOTA = &domain.AOOTAClassification{
			Code: domain.AOOTAB3,
		}
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Type: domain.LaugeHansenPA,
		}
		// Bartonicek requires CT scan
		if input.HasCTScan != nil && *input.HasCTScan {
			result.Bartonicek = getBartonicekFromPosteriorType(input.PosteriorFractureType)
		}

	case domain.LateralMorphologyOblique:
		result.DanisWeber = &domain.DanisWeberClassification{
			Type: domain.DanisWeberB,
		}
		result.AOOTA = &domain.AOOTAClassification{
			Code: domain.AOOTAB3,
		}
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Type: domain.LaugeHansenPA,
		}
		// Bartonicek requires CT scan
		if input.HasCTScan != nil && *input.HasCTScan {
			result.Bartonicek = getBartonicekFromPosteriorType(input.PosteriorFractureType)
		}

	case domain.LateralMorphologySpiral:
		result.DanisWeber = &domain.DanisWeberClassification{
			Type: domain.DanisWeberB,
		}
		result.AOOTA = &domain.AOOTAClassification{
			Code: domain.AOOTAB3,
		}
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Type: domain.LaugeHansenSER,
		}
		// Bartonicek requires CT scan
		if input.HasCTScan != nil && *input.HasCTScan {
			result.Bartonicek = getBartonicekFromPosteriorType(input.PosteriorFractureType)
		}
	}

	return result, nil
}

// Helper functions

func getBartonicekFromPosteriorType(pt domain.PosteriorFractureType) *domain.BartonicekClassification {
	switch pt {
	case domain.PosteriorExtraincisural:
		return &domain.BartonicekClassification{
			Type: domain.BartonicekType1,
		}
	case domain.PosteriorPosterolateral:
		return &domain.BartonicekClassification{
			Type: domain.BartonicekType2,
		}
	case domain.PosteriorPosteromedialPosterolateral:
		return &domain.BartonicekClassification{
			Type: domain.BartonicekType3,
		}
	case domain.PosteriorLargePosterolateral:
		return &domain.BartonicekClassification{
			Type: domain.BartonicekType4,
		}
	}
	return nil
}

// getAOOTAForSuprasindesmal maps SuprasindesmalType to the AO/OTA code.
// Used for lateral-only, bimalleolar, and trimaleolar suprasyndesmotic fractures
// (all variants produce the same mapping).
func getAOOTAForSuprasindesmal(st domain.SuprasindesmalType) *domain.AOOTAClassification {
	switch st {
	case domain.SuprasindesmalSimpleDiaphyseal:
		return &domain.AOOTAClassification{
			Code: domain.AOOTAC1,
		}
	case domain.SuprasindesmalMultifragmentary:
		return &domain.AOOTAClassification{
			Code: domain.AOOTAC2,
		}
	case domain.SuprasindesmalProximal:
		return &domain.AOOTAClassification{
			Code: domain.AOOTAC3,
		}
	}
	return &domain.AOOTAClassification{
		Code: domain.AOOTAC1,
	}
}
