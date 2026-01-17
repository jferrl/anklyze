package rules

import "github.com/jferrl/fratures/internal/domain"

// Engine is the rule engine that classifies ankle fractures
type Engine struct{}

// NewEngine creates a new rule engine
func NewEngine() *Engine {
	return &Engine{}
}

// Classify applies the classification rules based on the decision tree:
// 1. Medial malleolus morphology determines SA vs SER/PER/PA
// 2. Fibular level determines PER/Weber C if suprasindesmal high
// 3. Fibular morphology determines SA/PA/SER if not suprasindesmal high
// 4. SER fragments (Wagstaffe/Tillaux-Chaput) for SER fractures
func (e *Engine) Classify(input domain.FractureInput) (*domain.ClassificationResult, error) {
	result := &domain.ClassificationResult{}
	var notes []string

	// Determine classification based on decision tree
	var laugeHansenType domain.LaugeHansenType
	var danisWeberType domain.DanisWeberType

	// Track if this is an isolated lateral fracture (no medial involvement)
	isIsolatedLateral := input.MedialMorphology == domain.MedialMorphologyNone

	// Step 1: Check medial malleolus morphology
	if input.MedialMorphology == domain.MedialMorphologyOblique {
		// Oblique/vertical medial malleolus = SA
		laugeHansenType = domain.LaugeHansenSA
		danisWeberType = domain.DanisWeberA
		notes = append(notes, "Morfología oblicua/vertical del maléolo medial indica mecanismo de 'push-off' (SA)")
	} else if input.MedialMorphology == domain.MedialMorphologyNone {
		// No medial fracture - isolated lateral fracture
		notes = append(notes, "Sin fractura del maléolo medial - fractura aislada lateral")

		// Determine Weber type based on fibular level
		if input.FibularLevel == domain.FibularLevelSuprasindesmalHigh {
			// High fibular fracture (>6cm) = Weber C
			danisWeberType = domain.DanisWeberC
			laugeHansenType = domain.LaugeHansenPER
			notes = append(notes, "Fractura alta del peroné (>6cm) - Weber C")
		} else {
			// Need to check fibular morphology for Weber A vs B
			switch input.FibularMorphology {
			case domain.FibularMorphologyTransverse:
				danisWeberType = domain.DanisWeberA
				laugeHansenType = domain.LaugeHansenSA
				notes = append(notes, "Fractura transversa del peroné - Weber A")
			case domain.FibularMorphologyTransverseOblique:
				danisWeberType = domain.DanisWeberB
				laugeHansenType = domain.LaugeHansenPA
				notes = append(notes, "Fractura transversa/oblicua del peroné - Weber B")
			case domain.FibularMorphologySpiral:
				danisWeberType = domain.DanisWeberB
				laugeHansenType = domain.LaugeHansenSER
				notes = append(notes, "Fractura espiroidea del peroné - Weber B")
			}
		}
	} else {
		// Transverse medial malleolus = SER/PER/PA - need to check fibular level
		notes = append(notes, "Morfología transversa del maléolo medial indica mecanismo de avulsión 'pull-off'")

		// Step 2: Check fibular level
		if input.FibularLevel == domain.FibularLevelSuprasindesmalHigh {
			// High fibular fracture (>6cm) = PER/Weber C
			laugeHansenType = domain.LaugeHansenPER
			danisWeberType = domain.DanisWeberC
			notes = append(notes, "Fractura alta del peroné (>6cm del pilón tibial) característica de PER")
		} else {
			// Need to check fibular morphology (Question 3)
			switch input.FibularMorphology {
			case domain.FibularMorphologyTransverse:
				// Transverse fibular = SA/Weber A
				laugeHansenType = domain.LaugeHansenSA
				danisWeberType = domain.DanisWeberA
				notes = append(notes, "Fractura transversa del peroné típica de SA/Weber A")

			case domain.FibularMorphologyTransverseOblique:
				// Transverse-oblique (low medial, high lateral) = PA
				laugeHansenType = domain.LaugeHansenPA
				danisWeberType = domain.DanisWeberB // PA is typically Weber B or C
				notes = append(notes, "Fractura transversa/oblicua (baja medial, alta lateral) típica de PA")

			case domain.FibularMorphologySpiral:
				// Spiral (low anterior, high posterior) = SER/Weber B
				laugeHansenType = domain.LaugeHansenSER
				danisWeberType = domain.DanisWeberB
				notes = append(notes, "Fractura espiroidea (baja anterior, alta posterior) típica de SER/Weber B")
			}
		}
	}

	// Build Lauge-Hansen classification
	result.LaugeHansen = domain.LaugeHansenClassification{
		Type:        laugeHansenType,
		FullName:    getLaugeHansenFullName(laugeHansenType),
		Description: getLaugeHansenDescription(laugeHansenType),
	}

	// Step 4: Check for SER fragments
	if laugeHansenType == domain.LaugeHansenSER && input.SERFragment != "" && input.SERFragment != domain.SERFragmentNone {
		switch input.SERFragment {
		case domain.SERFragmentWagstaffe:
			result.LaugeHansen.Fragment = "Fragmento de Wagstaffe"
			notes = append(notes, "Fractura SER con fragmento de Wagstaffe (avulsión del ligamento tibioperoneal anteroinferior)")
		case domain.SERFragmentTillauxChaput:
			result.LaugeHansen.Fragment = "Fragmento de Tillaux-Chaput"
			notes = append(notes, "Fractura SER con fragmento de Tillaux-Chaput (avulsión anterolateral de la tibia)")
		}
	}

	// Build Danis-Weber classification
	result.DanisWeber = domain.DanisWeberClassification{
		Type:        danisWeberType,
		Description: getDanisWeberDescription(danisWeberType),
	}

	// Step 5: Calculate AO/OTA classification based on Weber type and involvement/fracture type
	var aootaCode domain.AOOTACode

	// If isolated lateral (no medial fracture), always use variant 1 (aislada lateral)
	if isIsolatedLateral {
		switch danisWeberType {
		case domain.DanisWeberA:
			aootaCode = domain.AOOTAA1
		case domain.DanisWeberB:
			aootaCode = domain.AOOTAB1
		case domain.DanisWeberC:
			aootaCode = domain.AOOTAC1
		}
	} else if danisWeberType == domain.DanisWeberC {
		// For Weber C with medial involvement, use the Weber C fracture type question
		switch input.WeberCFractureType {
		case domain.WeberCFractureSimple:
			aootaCode = domain.AOOTAC1
		case domain.WeberCFractureMultifragmentary:
			aootaCode = domain.AOOTAC2
		case domain.WeberCFractureProximal:
			aootaCode = domain.AOOTAC3
		default:
			aootaCode = domain.AOOTAC1 // Default to C1
		}
	} else {
		// For Weber A and B with medial involvement, use the fracture involvement question
		switch input.FractureInvolvement {
		case domain.FractureInvolvementLateralOnly:
			if danisWeberType == domain.DanisWeberA {
				aootaCode = domain.AOOTAA1
			} else {
				aootaCode = domain.AOOTAB1
			}
		case domain.FractureInvolvementLateralMedial:
			if danisWeberType == domain.DanisWeberA {
				aootaCode = domain.AOOTAA2
			} else {
				aootaCode = domain.AOOTAB2
			}
		case domain.FractureInvolvementLateralMedialPosterior:
			if danisWeberType == domain.DanisWeberA {
				aootaCode = domain.AOOTAA3
			} else {
				aootaCode = domain.AOOTAB3
			}
		default:
			if danisWeberType == domain.DanisWeberA {
				aootaCode = domain.AOOTAA1
			} else {
				aootaCode = domain.AOOTAB1
			}
		}
	}

	result.AOOTA = domain.AOOTAClassification{
		Code:        aootaCode,
		Description: getAOOTADescription(aootaCode),
	}

	result.Notes = notes
	return result, nil
}

func getLaugeHansenFullName(t domain.LaugeHansenType) string {
	names := map[domain.LaugeHansenType]string{
		domain.LaugeHansenSA:  "Supinación-Aducción",
		domain.LaugeHansenSER: "Supinación-Rotación Externa",
		domain.LaugeHansenPER: "Pronación-Rotación Externa",
		domain.LaugeHansenPA:  "Pronación-Abducción",
	}
	return names[t]
}

func getLaugeHansenDescription(t domain.LaugeHansenType) string {
	descriptions := map[domain.LaugeHansenType]string{
		domain.LaugeHansenSA:  "Mecanismo de supinación con fuerza de aducción. Fractura del maléolo medial vertical/oblicua por 'push-off'.",
		domain.LaugeHansenSER: "Mecanismo de supinación con rotación externa del astrágalo. Fractura espiroidea del peroné.",
		domain.LaugeHansenPER: "Mecanismo de pronación con rotación externa. Fractura alta del peroné (>6cm suprasindesmal).",
		domain.LaugeHansenPA:  "Mecanismo de pronación con abducción. Fractura transversa/oblicua del peroné.",
	}
	return descriptions[t]
}

func getDanisWeberDescription(t domain.DanisWeberType) string {
	descriptions := map[domain.DanisWeberType]string{
		domain.DanisWeberA: "Tipo A: Fractura del peroné por debajo del nivel de la sindesmosis. Sindesmosis intacta. Lesión estable.",
		domain.DanisWeberB: "Tipo B: Fractura del peroné a nivel de la sindesmosis. Sindesmosis parcialmente lesionada. Estabilidad variable.",
		domain.DanisWeberC: "Tipo C: Fractura del peroné por encima de la sindesmosis (>6cm). Sindesmosis rota. Lesión inestable.",
	}
	return descriptions[t]
}

func getAOOTADescription(code domain.AOOTACode) string {
	descriptions := map[domain.AOOTACode]string{
		// Type A
		domain.AOOTAA1: "44-A1: Fractura infrasindesmal aislada del maléolo lateral (peroné)",
		domain.AOOTAA2: "44-A2: Fractura infrasindesmal del maléolo lateral con afectación medial",
		domain.AOOTAA3: "44-A3: Fractura infrasindesmal del maléolo lateral con afectación medial y posterior",
		// Type B
		domain.AOOTAB1: "44-B1: Fractura transindesmal aislada del maléolo lateral (peroné)",
		domain.AOOTAB2: "44-B2: Fractura transindesmal del maléolo lateral con afectación medial",
		domain.AOOTAB3: "44-B3: Fractura transindesmal del maléolo lateral con afectación medial y posterior",
		// Type C
		domain.AOOTAC1: "44-C1: Fractura suprasindesmal simple diafisaria del peroné",
		domain.AOOTAC2: "44-C2: Fractura suprasindesmal multifragmentaria del peroné",
		domain.AOOTAC3: "44-C3: Fractura suprasindesmal proximal del peroné (Maisonneuve)",
	}
	return descriptions[code]
}
