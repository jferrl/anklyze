// Package rules implements the classification rules for ankle fractures.
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
	// AO = nil (no clasificable per drawio 2026-02-28)
	result := &domain.ClassificationResult{
		FractureType: "unimaleolar_medial",
	}

	if input.MedialMorphology == domain.MedialMorphologyVertical {
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Type: domain.LaugeHansenSA,
		}
	}
	// Transverse/oblique → LH not classifiable (nil) per drawio 2026-02-28

	return result, nil
}

// classifyLateralOnly handles lateral malleolus only fractures
func (e *Engine) classifyLateralOnly(input domain.FractureInput) (*domain.ClassificationResult, error) {
	result := &domain.ClassificationResult{
		FractureType: "unimaleolar_lateral",
	}

	switch input.FibularLevel {
	case domain.FibularLevelInfrasindesmal:
		result.DanisWeber = &domain.DanisWeberClassification{
			Type: domain.DanisWeberA,
		}
		// Subtype: avulsion → 44-A1.2, malleolus_fracture → 44-A1.3, fallback → 44-A1
		aoCode := domain.AOOTAA1
		switch input.InfrasindesmalMorphology {
		case domain.LateralSubtypeAvulsion:
			aoCode = domain.AOOTAA1_2
		case domain.LateralSubtypeMalleolusFracture:
			aoCode = domain.AOOTAA1_3
		}
		result.AOOTA = &domain.AOOTAClassification{
			Code: aoCode,
		}
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Type: domain.LaugeHansenSA,
		}

	case domain.FibularLevelTransindesmal:
		result.DanisWeber = &domain.DanisWeberClassification{
			Type: domain.DanisWeberB,
		}
		// Subtype: simple → B1.1, syndesmosis_rupture → B1.2, butterfly → B1.3, fallback → B1
		aoCode := domain.AOOTAB1
		switch input.LateralSubtype {
		case domain.LateralSubtypeSimple:
			aoCode = domain.AOOTAB1_1
		case domain.LateralSubtypeSyndesmosisRupture:
			aoCode = domain.AOOTAB1_2
		case domain.LateralSubtypeButterfly:
			aoCode = domain.AOOTAB1_3
		}
		result.AOOTA = &domain.AOOTAClassification{
			Code: aoCode,
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
		switch {
		case input.SuprasindesmalType == domain.SuprasindesmalProximal:
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type: domain.LaugeHansenPER,
			}
		case input.FibulaTracePattern == domain.FibulaTraceParasindesmoticShort:
			// Parasyndesmotic short oblique/transverse/comminuted → PA
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type: domain.LaugeHansenPA,
			}
		default:
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
		// Per drawio 2026-02-28: AO = nil (no clasificable), LH = PA
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Type: domain.LaugeHansenPA,
		}
		return result, nil
	}

	// Standard 4 posterior types → AO unclassifiable (nil) + LH PA + Bartonicek (per 2026-02-28 flow)
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
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Type: domain.LaugeHansenSA,
		}

		if input.HasCTScan == nil || !*input.HasCTScan {
			// No CT → AO unclassifiable (nil), LH SA, Weber A
			return result, nil
		}

		if input.IsPosteriorPosteromedial != nil && *input.IsPosteriorPosteromedial {
			result.AOOTA = &domain.AOOTAClassification{
				Code: domain.AOOTAA3,
			}
		} else {
			result.Bartonicek = getBartonicekFromPosteriorType(input.PosteriorFractureType)
		}

		return result, nil

	case domain.FibularLevelTransindesmal:
		result.DanisWeber = &domain.DanisWeberClassification{
			Type: domain.DanisWeberB,
		}
		// AO not classifiable for lateral+posterior transindesmal per drawio 2026-02-28
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
		// AO unclassifiable (nil) per 2026-02-28 flow for all lateral+posterior suprasindesmal paths

		// For simple diaphyseal and multifragmentary, use fibula trace pattern to determine PA vs PER
		// Proximal is always PER
		switch {
		case input.SuprasindesmalType == domain.SuprasindesmalProximal:
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type: domain.LaugeHansenPER,
			}
		case input.FibulaTracePattern == domain.FibulaTraceParasindesmoticShort:
			// Parasyndesmotic short oblique/transverse/comminuted → PA
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type: domain.LaugeHansenPA,
			}
		default:
			// Parasyndesmotic or suprasyndesmotic long oblique/spiral → PER (default)
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type: domain.LaugeHansenPER,
			}
		}
		// Bartonicek requires CT scan
		if input.HasCTScan != nil && *input.HasCTScan {
			result.Bartonicek = getBartonicekFromPosteriorType(input.PosteriorFractureType)
		}
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

	switch input.FibularLevel {
	case domain.FibularLevelInfrasindesmal:
		// Infrasindesmal → Weber A, AO A2.2 (avulsion) or A2.3 (malleolus_fracture), LH SA
		result.DanisWeber = &domain.DanisWeberClassification{
			Type: domain.DanisWeberA,
		}
		aoCode := domain.AOOTAA2
		switch input.InfrasindesmalMorphology {
		case domain.LateralSubtypeAvulsion:
			aoCode = domain.AOOTAA2_2
		case domain.LateralSubtypeMalleolusFracture:
			aoCode = domain.AOOTAA2_3
		}
		result.AOOTA = &domain.AOOTAClassification{
			Code: aoCode,
		}
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Type: domain.LaugeHansenSA,
		}
		return result, nil

	case domain.FibularLevelSuprasindesmal:
		result.DanisWeber = &domain.DanisWeberClassification{
			Type: domain.DanisWeberC,
		}

		// For simple diaphyseal and multifragmentary, use fibula trace pattern to determine PA vs PER
		// Proximal is always PER
		switch {
		case input.SuprasindesmalType == domain.SuprasindesmalProximal:
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type: domain.LaugeHansenPER,
			}
			// Proximal subtypes: HasFibulaHeadShortening → C3.1/C3.2
			aoCode := domain.AOOTAC3
			if input.HasFibulaHeadShortening != nil {
				if *input.HasFibulaHeadShortening {
					aoCode = domain.AOOTAC3_2
				} else {
					aoCode = domain.AOOTAC3_1
				}
			}
			result.AOOTA = &domain.AOOTAClassification{Code: aoCode}
		case input.FibulaTracePattern == domain.FibulaTraceParasindesmoticShort:
			// Parasyndesmotic short oblique/transverse/comminuted → PA
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type: domain.LaugeHansenPA,
			}
			result.AOOTA = getAOOTAForSuprasindesmalWithMedialSubtype(input.SuprasindesmalType, input.MedialSubtype)
		default:
			// Parasyndesmotic or suprasyndesmotic long oblique/spiral → PER (default)
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type: domain.LaugeHansenPER,
			}
			result.AOOTA = getAOOTAForSuprasindesmalWithMedialSubtype(input.SuprasindesmalType, input.MedialSubtype)
		}
		return result, nil

	case domain.FibularLevelTransindesmal:
		// Transindesmal → check morphology
		switch input.LateralMorphology {
		case domain.LateralMorphologyTransverse:
			result.DanisWeber = &domain.DanisWeberClassification{
				Type: domain.DanisWeberB,
			}
			aoCode := domain.AOOTAB2
			switch input.MedialSubtype {
			case domain.MedialSubtypeOpenMortise:
				aoCode = domain.AOOTAB2_1
			case domain.MedialSubtypeMalleolusFracture:
				aoCode = domain.AOOTAB2_2
			}
			result.AOOTA = &domain.AOOTAClassification{
				Code: aoCode,
			}
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type: domain.LaugeHansenPA,
			}

		case domain.LateralMorphologyOblique:
			result.DanisWeber = &domain.DanisWeberClassification{
				Type: domain.DanisWeberB,
			}
			aoCode := domain.AOOTAB2
			switch input.MedialSubtype {
			case domain.MedialSubtypeOpenMortise:
				aoCode = domain.AOOTAB2_1
			case domain.MedialSubtypeMalleolusFracture:
				aoCode = domain.AOOTAB2_2
			}
			result.AOOTA = &domain.AOOTAClassification{
				Code: aoCode,
			}
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type: domain.LaugeHansenPA,
			}

		case domain.LateralMorphologySpiral:
			result.DanisWeber = &domain.DanisWeberClassification{
				Type: domain.DanisWeberB,
			}
			aoCode := domain.AOOTAB2
			switch input.MedialSubtype {
			case domain.MedialSubtypeOpenMortise:
				aoCode = domain.AOOTAB2_1
			case domain.MedialSubtypeMalleolusFracture:
				aoCode = domain.AOOTAB2_2
			}
			result.AOOTA = &domain.AOOTAClassification{
				Code: aoCode,
			}
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type: domain.LaugeHansenSER,
			}

		case domain.LateralMorphologyConminuta:
			// Conminuta morphology in lateral+medial → B2.3 per drawio 2026-02-28
			result.DanisWeber = &domain.DanisWeberClassification{
				Type: domain.DanisWeberB,
			}
			result.AOOTA = &domain.AOOTAClassification{
				Code: domain.AOOTAB2_3,
			}
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type: domain.LaugeHansenPA,
			}
		}
	}

	return result, nil
}

// classifyTrimaleolar handles trimaleolar fractures
func (e *Engine) classifyTrimaleolar(input domain.FractureInput) (*domain.ClassificationResult, error) {
	result := &domain.ClassificationResult{
		FractureType: "trimaleolar",
	}

	switch input.FibularLevel {
	case domain.FibularLevelInfrasindesmal:
		// Infrasindesmal → Weber A, AO A3.2 (avulsion) or A3.3 (malleolus_fracture), LH no clasificable
		aoCode := domain.AOOTAA3_3
		switch input.InfrasindesmalMorphology {
		case domain.LateralSubtypeAvulsion:
			aoCode = domain.AOOTAA3_2
		case domain.LateralSubtypeMalleolusFracture:
			aoCode = domain.AOOTAA3_3
		}
		result.DanisWeber = &domain.DanisWeberClassification{
			Type: domain.DanisWeberA,
		}
		result.AOOTA = &domain.AOOTAClassification{
			Code: aoCode,
		}
		// LH = no clasificable (nil)
		// Bartonicek requires CT scan
		if input.HasCTScan != nil && *input.HasCTScan {
			result.Bartonicek = getBartonicekFromPosteriorType(input.PosteriorFractureType)
		}
		return result, nil

	case domain.FibularLevelSuprasindesmal:
		result.DanisWeber = &domain.DanisWeberClassification{
			Type: domain.DanisWeberC,
		}

		// For simple diaphyseal and multifragmentary, use fibula trace pattern to determine PA vs PER
		// Proximal is always PER
		switch {
		case input.SuprasindesmalType == domain.SuprasindesmalProximal:
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type: domain.LaugeHansenPER,
			}
		case input.FibulaTracePattern == domain.FibulaTraceParasindesmoticShort:
			// Parasyndesmotic short oblique/transverse/comminuted → PA
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type: domain.LaugeHansenPA,
			}
		default:
			// Parasyndesmotic or suprasyndesmotic long oblique/spiral → PER (default)
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type: domain.LaugeHansenPER,
			}
		}
		// Bartonicek requires CT scan
		if input.HasCTScan != nil && *input.HasCTScan {
			result.Bartonicek = getBartonicekFromPosteriorType(input.PosteriorFractureType)
		}
		result.AOOTA = getAOOTAForSuprasindesmalTrimaleolar(input.SuprasindesmalType)
		return result, nil

	case domain.FibularLevelTransindesmal:
		// Transindesmal → check morphology
		switch input.LateralMorphology {
		case domain.LateralMorphologyTransverse:
			result.DanisWeber = &domain.DanisWeberClassification{
				Type: domain.DanisWeberB,
			}
			result.AOOTA = getAOOTAB3ForTrimaleolar(input.LateralMorphology, input.MedialSubtype)
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type: domain.LaugeHansenPA,
			}

		case domain.LateralMorphologyOblique:
			result.DanisWeber = &domain.DanisWeberClassification{
				Type: domain.DanisWeberB,
			}
			result.AOOTA = getAOOTAB3ForTrimaleolar(input.LateralMorphology, input.MedialSubtype)
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type: domain.LaugeHansenPA,
			}

		case domain.LateralMorphologySpiral:
			result.DanisWeber = &domain.DanisWeberClassification{
				Type: domain.DanisWeberB,
			}
			result.AOOTA = getAOOTAB3ForTrimaleolar(input.LateralMorphology, input.MedialSubtype)
			result.LaugeHansen = &domain.LaugeHansenClassification{
				Type: domain.LaugeHansenSER,
			}

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
// Used for lateral-only and trimaleolar suprasyndesmotic fractures.
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

// getAOOTAForSuprasindesmalTrimaleolar maps SuprasindesmalType to the AO/OTA .3 subtype code.
// Used for trimaleolar suprasyndesmotic fractures per drawio 2026-02-28.
func getAOOTAForSuprasindesmalTrimaleolar(st domain.SuprasindesmalType) *domain.AOOTAClassification {
	switch st {
	case domain.SuprasindesmalSimpleDiaphyseal:
		return &domain.AOOTAClassification{Code: domain.AOOTAC1_3}
	case domain.SuprasindesmalMultifragmentary:
		return &domain.AOOTAClassification{Code: domain.AOOTAC2_3}
	case domain.SuprasindesmalProximal:
		return &domain.AOOTAClassification{Code: domain.AOOTAC3_3}
	}
	return &domain.AOOTAClassification{Code: domain.AOOTAC1_3}
}

// getAOOTAB3ForTrimaleolar maps LateralMorphology + MedialSubtype to the B3 subtype code
// for trimaleolar transyndesmotic fractures per drawio 2026-02-28.
//
// Oblique morphology:
//   - malleolus_fracture → B3.3
//   - open_mortise       → nil (no clasificable)
//
// Non-oblique (Transverse, Spiral):
//   - open_mortise       → B3.1
//   - malleolus_fracture → B3.2
//   - fallback           → B3
func getAOOTAB3ForTrimaleolar(lm domain.LateralMorphology, ms domain.MedialSubtype) *domain.AOOTAClassification {
	if lm == domain.LateralMorphologyOblique {
		if ms == domain.MedialSubtypeMalleolusFracture {
			return &domain.AOOTAClassification{Code: domain.AOOTAB3_3}
		}
		// Oblique + open_mortise (or no medial subtype) → no clasificable
		return nil
	}
	// Transverse, Spiral: standard mapping
	switch ms {
	case domain.MedialSubtypeOpenMortise:
		return &domain.AOOTAClassification{Code: domain.AOOTAB3_1}
	case domain.MedialSubtypeMalleolusFracture:
		return &domain.AOOTAClassification{Code: domain.AOOTAB3_2}
	}
	return &domain.AOOTAClassification{Code: domain.AOOTAB3}
}

// getAOOTAForSuprasindesmalWithMedialSubtype maps SuprasindesmalType + MedialSubtype to AO/OTA code.
// Used for lateral+medial suprasyndesmotic fractures where C1/C2 have subtypes.
func getAOOTAForSuprasindesmalWithMedialSubtype(st domain.SuprasindesmalType, ms domain.MedialSubtype) *domain.AOOTAClassification {
	switch st {
	case domain.SuprasindesmalSimpleDiaphyseal:
		switch ms {
		case domain.MedialSubtypeOpenMortise:
			return &domain.AOOTAClassification{Code: domain.AOOTAC1_1}
		case domain.MedialSubtypeMalleolusFracture:
			return &domain.AOOTAClassification{Code: domain.AOOTAC1_2}
		}
		return &domain.AOOTAClassification{Code: domain.AOOTAC1}
	case domain.SuprasindesmalMultifragmentary:
		switch ms {
		case domain.MedialSubtypeOpenMortise:
			return &domain.AOOTAClassification{Code: domain.AOOTAC2_1}
		case domain.MedialSubtypeMalleolusFracture:
			return &domain.AOOTAClassification{Code: domain.AOOTAC2_2}
		}
		return &domain.AOOTAClassification{Code: domain.AOOTAC2}
	case domain.SuprasindesmalProximal:
		return &domain.AOOTAClassification{Code: domain.AOOTAC3}
	}
	return &domain.AOOTAClassification{Code: domain.AOOTAC1}
}
