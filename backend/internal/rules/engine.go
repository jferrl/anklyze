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
	result := &domain.ClassificationResult{
		FractureType: "unimaleolar_posterior",
		AOOTA: &domain.AOOTAClassification{
			Code: domain.AOOTAB3,
		},
		// Posterior-only fractures are Lauge-Hansen unclassifiable
		// as isolated posterior malleolus fractures don't fit the classic LH mechanisms
		LaugeHansen: &domain.LaugeHansenClassification{
			Ambiguous: true,
		},
	}

	// Bartonicek classification requires CT scan
	if input.HasCTScan != nil && *input.HasCTScan {
		result.Bartonicek = getBartonicekFromPosteriorType(input.PosteriorFractureType)
	}

	return result, nil
}

// classifyMedialOnly handles medial malleolus only fractures
func (e *Engine) classifyMedialOnly(input domain.FractureInput) (*domain.ClassificationResult, error) {
	result := &domain.ClassificationResult{
		FractureType: "unimaleolar_medial",
		AOOTA: &domain.AOOTAClassification{
			Code: domain.AOOTAA1,
		},
	}

	if input.MedialMorphology == domain.MedialMorphologyOblique {
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Type: domain.LaugeHansenSA,
		}
	} else {
		// Transverse - ambiguous, could be PA, SER, or PER
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
			Code: domain.AOOTAB1,
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
		AOOTA: &domain.AOOTAClassification{
			Code: domain.AOOTAB3,
		},
	}

	// Lauge-Hansen is ambiguous - could be SER or PA mechanism
	if input.HasCTScan != nil && *input.HasCTScan {
		result.Bartonicek = getBartonicekFromPosteriorType(input.PosteriorFractureType)
	}
	result.LaugeHansen = &domain.LaugeHansenClassification{
		Ambiguous:     true,
		PossibleTypes: []string{"SER", "PA"},
	}

	return result, nil
}

// classifyLateralPosterior handles lateral + posterior fractures
func (e *Engine) classifyLateralPosterior(input domain.FractureInput) (*domain.ClassificationResult, error) {
	result := &domain.ClassificationResult{
		FractureType: "bimaleolar_lateral_posterior",
	}

	switch input.FibularLevel {
	case domain.FibularLevelInfrasindesmal:
		// All infrasindesmal lateral+posterior combinations are impossible
		// SA mechanism does not involve posterior malleolus
		// PA mechanism is transsyndesmotic or suprasyndesmotic
		return &domain.ClassificationResult{
			FractureType:  "bimaleolar_lateral_posterior",
			Impossible:    true,
			ImpossibleKey: "sa_mechanism",
		}, nil

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
		result.AOOTA = getAOOTAForSuprasindesmalBimaleolar(input.SuprasindesmalType)
	}

	return result, nil
}

// classifyLateralMedial handles lateral + medial fractures
func (e *Engine) classifyLateralMedial(input domain.FractureInput) (*domain.ClassificationResult, error) {
	result := &domain.ClassificationResult{
		FractureType: "bimaleolar_lateral_medial",
	}

	// Path: Oblique medial + infrasindesmal transverse fibula
	if input.MedialMorphology == domain.MedialMorphologyOblique &&
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
	if input.FibularLevelForTransverse == domain.FibularLevelSuprasindesmal {
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
		result.AOOTA = getAOOTAForSuprasindesmalBimaleolar(input.SuprasindesmalType)
		return result, nil
	}

	// Path: Low - check morphology
	switch input.LateralMorphology {
	case domain.LateralMorphologyTransverse:
		// Need to check fibular level
		if input.FibularLevel == domain.FibularLevelInfrasindesmal {
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
		result.AOOTA = getAOOTAForSuprasindesmalTrimaleolar(input.SuprasindesmalType)
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

func getAOOTAForSuprasindesmalBimaleolar(st domain.SuprasindesmalType) *domain.AOOTAClassification {
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

func getAOOTAForSuprasindesmalTrimaleolar(st domain.SuprasindesmalType) *domain.AOOTAClassification {
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
