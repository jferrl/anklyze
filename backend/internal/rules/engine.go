package rules

import "github.com/jferrl/fratures/internal/domain"

// Engine is the rule engine that classifies ankle fractures
type Engine struct{}

// NewEngine creates a new rule engine
func NewEngine() *Engine {
	return &Engine{}
}

// Classify applies the classification rules based on the decision tree from the flow diagram
// The flow starts with: "¿Tiene fractura del maléolo medial?"
func (e *Engine) Classify(input domain.FractureInput) (*domain.ClassificationResult, error) {
	result := &domain.ClassificationResult{}
	var notes []string

	// Determine which path to follow based on fractured malleoli
	hasMedial := input.HasMedialFracture
	hasLateral := input.HasLateralFracture
	hasPosterior := input.HasPosteriorFracture

	// PATH 1: No medial fracture
	if !hasMedial {
		// No medial → Check lateral
		if !hasLateral {
			// No medial, no lateral → Only posterior (Bartonicek classification)
			if hasPosterior {
				notes = append(notes, "Fractura aislada del maléolo posterior")
				result.Bartonicek = getBartonicekClassification(input.PosteriorFractureType)
				result.Notes = notes
				return result, nil
			}
			// No fractures at all - shouldn't happen
			notes = append(notes, "No se detectaron fracturas de maléolos")
			result.Notes = notes
			return result, nil
		}

		// Has lateral, no medial → Check if only lateral
		if !hasPosterior {
			// Only lateral (no medial, no posterior)
			return e.classifyLateralOnly(input, notes)
		}

		// Has lateral + posterior (no medial) → Complex path
		return e.classifyComplexPath(input, notes)
	}

	// PATH 2: Has medial fracture
	if !hasLateral && !hasPosterior {
		// Only medial
		notes = append(notes, "Fractura unimaleolar del maléolo medial")
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Type:        domain.LaugeHansenPER,
			FullName:    getLaugeHansenFullName(domain.LaugeHansenPER),
			Description: "Fractura aislada del maléolo medial, típicamente asociada a mecanismo PER/PA",
		}
		result.AOOTA = &domain.AOOTAClassification{
			Code:        domain.AOOTAA1,
			Description: getAOOTADescription(domain.AOOTAA1),
		}
		result.Notes = notes
		return result, nil
	}

	if !hasLateral && hasPosterior {
		// Medial + Posterior (no lateral)
		notes = append(notes, "Fractura bimaleolar del maléolo medial y posterior")
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Type:        domain.LaugeHansenPA,
			FullName:    getLaugeHansenFullName(domain.LaugeHansenPA),
			Description: "Fractura del maléolo medial con afectación posterior, mecanismo PA",
		}
		result.AOOTA = &domain.AOOTAClassification{
			Code:        domain.AOOTAA2,
			Description: getAOOTADescription(domain.AOOTAA2),
		}
		result.Notes = notes
		return result, nil
	}

	// PATH 3: Medial + Lateral (± Posterior) → Complex path with medial morphology
	return e.classifyComplexPath(input, notes)
}

// classifyLateralOnly handles the lateral-only fracture path
func (e *Engine) classifyLateralOnly(input domain.FractureInput, notes []string) (*domain.ClassificationResult, error) {
	result := &domain.ClassificationResult{}
	notes = append(notes, "Fractura aislada del maléolo lateral")

	level := input.LateralFractureLevel

	switch level {
	case domain.FibularLevelInfrasindesmal:
		// Infrasindesmal → Weber A, AO-44-A1, LH SA
		notes = append(notes, "Fractura infrasindesmal (por debajo de la sindesmosis)")
		result.DanisWeber = &domain.DanisWeberClassification{
			Type:        domain.DanisWeberA,
			Description: getDanisWeberDescription(domain.DanisWeberA),
		}
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Type:        domain.LaugeHansenSA,
			FullName:    getLaugeHansenFullName(domain.LaugeHansenSA),
			Description: getLaugeHansenDescription(domain.LaugeHansenSA),
		}
		result.AOOTA = &domain.AOOTAClassification{
			Code:        domain.AOOTAA1,
			Description: getAOOTADescription(domain.AOOTAA1),
		}

	case domain.FibularLevelTransindesmal:
		// Transindesmal → Weber B, AO-44-B1, LH SER
		notes = append(notes, "Fractura transindesmal (a nivel de la sindesmosis)")
		result.DanisWeber = &domain.DanisWeberClassification{
			Type:        domain.DanisWeberB,
			Description: getDanisWeberDescription(domain.DanisWeberB),
		}
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Type:        domain.LaugeHansenSER,
			FullName:    getLaugeHansenFullName(domain.LaugeHansenSER),
			Description: getLaugeHansenDescription(domain.LaugeHansenSER),
		}
		result.AOOTA = &domain.AOOTAClassification{
			Code:        domain.AOOTAB1,
			Description: getAOOTADescription(domain.AOOTAB1),
		}

	case domain.FibularLevelSuprasindesmalHigh:
		// Suprasindesmal → Weber C, LH PER, AO based on type
		notes = append(notes, "Fractura suprasindesmal alta (>6cm por encima de la sindesmosis)")
		result.DanisWeber = &domain.DanisWeberClassification{
			Type:        domain.DanisWeberC,
			Description: getDanisWeberDescription(domain.DanisWeberC),
		}
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Type:        domain.LaugeHansenPER,
			FullName:    getLaugeHansenFullName(domain.LaugeHansenPER),
			Description: getLaugeHansenDescription(domain.LaugeHansenPER),
		}

		// AO classification based on fracture type
		var aootaCode domain.AOOTACode
		switch input.SuprasindesmalType {
		case domain.WeberCSimpleDiaphyseal:
			aootaCode = domain.AOOTAC1
			notes = append(notes, "Fractura diafisaria simple")
		case domain.WeberCMultifragmentary:
			aootaCode = domain.AOOTAC2
			notes = append(notes, "Fractura multifragmentaria")
		case domain.WeberCProximal:
			aootaCode = domain.AOOTAC3
			notes = append(notes, "Fractura proximal (Maisonneuve)")
		default:
			aootaCode = domain.AOOTAC1
		}
		result.AOOTA = &domain.AOOTAClassification{
			Code:        aootaCode,
			Description: getAOOTADescription(aootaCode),
		}
	}

	result.Notes = notes
	return result, nil
}

// classifyComplexPath handles the complex path (medial+lateral or lateral+posterior)
func (e *Engine) classifyComplexPath(input domain.FractureInput, notes []string) (*domain.ClassificationResult, error) {
	// If has medial, start with medial morphology check
	if input.HasMedialFracture {
		return e.classifyWithMedialMorphology(input, notes)
	}

	// No medial, has lateral + posterior → Follow fibular level path
	notes = append(notes, "Fractura del maléolo lateral con afectación posterior")
	return e.classifyByFibularLevel(input, notes)
}

// classifyWithMedialMorphology handles cases where medial morphology determines the path
func (e *Engine) classifyWithMedialMorphology(input domain.FractureInput, notes []string) (*domain.ClassificationResult, error) {
	notes = append(notes, "Fractura con afectación del maléolo medial y lateral")

	switch input.MedialMorphology {
	case domain.MedialMorphologyObliqueVertical:
		// Oblique/vertical medial → Check if fibula is transverse
		notes = append(notes, "Morfología oblicua/vertical del maléolo medial (mecanismo push-off)")

		if input.FibulaTransverse != nil && *input.FibulaTransverse {
			// Transverse fibula → SA classification path
			notes = append(notes, "Fractura transversa del peroné")
			return e.classifySA(input, notes)
		}
		// Non-transverse fibula → Check fibular morphology
		return e.classifyByFibularMorphology(input, notes)

	case domain.MedialMorphologyTransverse, domain.MedialMorphologyDoubtful:
		// Transverse or doubtful medial → Check fibular morphology
		if input.MedialMorphology == domain.MedialMorphologyTransverse {
			notes = append(notes, "Morfología transversal del maléolo medial (mecanismo pull-off)")
		} else {
			notes = append(notes, "Morfología dudosa del maléolo medial")
		}
		return e.classifyByFibularLevel(input, notes)
	}

	// Default: classify by fibular level
	return e.classifyByFibularLevel(input, notes)
}

// classifyByFibularLevel handles classification based on fibular level
func (e *Engine) classifyByFibularLevel(input domain.FractureInput, notes []string) (*domain.ClassificationResult, error) {
	level := input.FibularLevel

	switch level {
	case domain.FibularLevelSuprasindesmalHigh:
		// Suprasindesmal high → Weber C / PER
		notes = append(notes, "Fractura suprasindesmal alta del peroné (>6cm)")
		return e.classifyWeberC(input, notes, domain.LaugeHansenPER)

	case domain.FibularLevelTransindesmal, domain.FibularLevelDoubtful:
		// Transindesmal or doubtful → Check fibular morphology
		if level == domain.FibularLevelTransindesmal {
			notes = append(notes, "Fractura transindesmal del peroné")
		} else {
			notes = append(notes, "Nivel de fractura del peroné dudoso")
		}
		return e.classifyByFibularMorphology(input, notes)

	case domain.FibularLevelInfrasindesmal:
		// Infrasindesmal → Check if transverse
		notes = append(notes, "Fractura infrasindesmal del peroné")
		if input.FibularTransverse != nil && *input.FibularTransverse {
			// Transverse → SA classification
			notes = append(notes, "Fractura transversa del peroné")
			return e.classifySA(input, notes)
		}
		// Not transverse → Check morphology
		return e.classifyByFibularMorphology(input, notes)
	}

	// Default to morphology check
	return e.classifyByFibularMorphology(input, notes)
}

// classifyByFibularMorphology handles classification based on fibular morphology
func (e *Engine) classifyByFibularMorphology(input domain.FractureInput, notes []string) (*domain.ClassificationResult, error) {
	morphology := input.FibularMorphology

	switch morphology {
	case domain.FibularMorphologyTransverse:
		// Transverse → SA classification
		notes = append(notes, "Morfología transversal del peroné")
		return e.classifySA(input, notes)

	case domain.FibularMorphologyOblique:
		// Oblique → Check level for PA classification
		notes = append(notes, "Morfología oblicua del peroné (baja medial / alta lateral)")
		return e.classifyObliqueFibula(input, notes)

	case domain.FibularMorphologySpiral:
		// Spiral → SER classification
		notes = append(notes, "Morfología espiroidea del peroné (baja anterior / alta posterior)")
		return e.classifySER(input, notes)
	}

	// Default to SER
	return e.classifySER(input, notes)
}

// classifySA handles SA (Supination-Adduction) classification
func (e *Engine) classifySA(input domain.FractureInput, notes []string) (*domain.ClassificationResult, error) {
	result := &domain.ClassificationResult{}

	result.LaugeHansen = &domain.LaugeHansenClassification{
		Type:        domain.LaugeHansenSA,
		FullName:    getLaugeHansenFullName(domain.LaugeHansenSA),
		Description: getLaugeHansenDescription(domain.LaugeHansenSA),
	}
	result.DanisWeber = &domain.DanisWeberClassification{
		Type:        domain.DanisWeberA,
		Description: getDanisWeberDescription(domain.DanisWeberA),
	}

	// AO classification based on involved malleoli
	var aootaCode domain.AOOTACode
	switch input.InvolvedMalleoli {
	case domain.InvolvedUnifocal:
		aootaCode = domain.AOOTAA1
		notes = append(notes, "Fractura unifocal (solo maléolo lateral)")
	case domain.InvolvedBifocal:
		aootaCode = domain.AOOTAA2
		notes = append(notes, "Fractura bifocal (maléolos lateral y medial)")
	case domain.InvolvedTrifocal:
		aootaCode = domain.AOOTAA3
		notes = append(notes, "Fractura trifocal (maléolos lateral, medial y posterior)")
	default:
		aootaCode = domain.AOOTAA1
	}

	result.AOOTA = &domain.AOOTAClassification{
		Code:        aootaCode,
		Description: getAOOTADescription(aootaCode),
	}

	result.Notes = notes
	return result, nil
}

// classifySER handles SER (Supination-External Rotation) classification
func (e *Engine) classifySER(input domain.FractureInput, notes []string) (*domain.ClassificationResult, error) {
	result := &domain.ClassificationResult{}

	result.LaugeHansen = &domain.LaugeHansenClassification{
		Type:        domain.LaugeHansenSER,
		FullName:    getLaugeHansenFullName(domain.LaugeHansenSER),
		Description: getLaugeHansenDescription(domain.LaugeHansenSER),
	}
	result.DanisWeber = &domain.DanisWeberClassification{
		Type:        domain.DanisWeberB,
		Description: getDanisWeberDescription(domain.DanisWeberB),
	}

	// AO classification based on involved malleoli
	var aootaCode domain.AOOTACode
	switch input.InvolvedMalleoli {
	case domain.InvolvedLateralOnly:
		aootaCode = domain.AOOTAB1
		notes = append(notes, "Fractura aislada del maléolo lateral")
	case domain.InvolvedLateralMedial:
		aootaCode = domain.AOOTAB2
		notes = append(notes, "Fractura de maléolos lateral y medial")
	case domain.InvolvedLateralMedialPosterior:
		aootaCode = domain.AOOTAB3
		notes = append(notes, "Fractura de maléolos lateral, medial y posterior")
		// Add Bartonicek if posterior is involved
		if input.PosteriorType != "" {
			result.Bartonicek = getBartonicekClassification(input.PosteriorType)
		}
	default:
		aootaCode = domain.AOOTAB1
	}

	result.AOOTA = &domain.AOOTAClassification{
		Code:        aootaCode,
		Description: getAOOTADescription(aootaCode),
	}

	result.Notes = notes
	return result, nil
}

// classifyObliqueFibula handles oblique fibula morphology → PA classification
func (e *Engine) classifyObliqueFibula(input domain.FractureInput, notes []string) (*domain.ClassificationResult, error) {
	result := &domain.ClassificationResult{}

	level := input.ObliqueFibularLevel
	if level == "" {
		level = input.FibularLevel
	}

	result.LaugeHansen = &domain.LaugeHansenClassification{
		Type:        domain.LaugeHansenPA,
		FullName:    getLaugeHansenFullName(domain.LaugeHansenPA),
		Description: getLaugeHansenDescription(domain.LaugeHansenPA),
	}

	switch level {
	case domain.FibularLevelInfrasindesmal:
		// Infrasindesmal oblique → Weber A
		notes = append(notes, "Fractura oblicua infrasindesmal")
		result.DanisWeber = &domain.DanisWeberClassification{
			Type:        domain.DanisWeberA,
			Description: getDanisWeberDescription(domain.DanisWeberA),
		}
		return e.classifyPAWeberA(input, notes, result)

	case domain.FibularLevelTransindesmal:
		// Transindesmal oblique → Weber B
		notes = append(notes, "Fractura oblicua transindesmal")
		result.DanisWeber = &domain.DanisWeberClassification{
			Type:        domain.DanisWeberB,
			Description: getDanisWeberDescription(domain.DanisWeberB),
		}
		return e.classifyPAWeberB(input, notes, result)

	case domain.FibularLevelSuprasindesmalHigh:
		// Suprasindesmal oblique → Weber C
		notes = append(notes, "Fractura oblicua suprasindesmal")
		return e.classifyWeberC(input, notes, domain.LaugeHansenPA)
	}

	// Default to Weber B
	result.DanisWeber = &domain.DanisWeberClassification{
		Type:        domain.DanisWeberB,
		Description: getDanisWeberDescription(domain.DanisWeberB),
	}
	return e.classifyPAWeberB(input, notes, result)
}

// classifyPAWeberA handles PA classification with Weber A
func (e *Engine) classifyPAWeberA(input domain.FractureInput, notes []string, result *domain.ClassificationResult) (*domain.ClassificationResult, error) {
	var aootaCode domain.AOOTACode

	switch input.InvolvedMalleoli {
	case domain.InvolvedUnifocal, domain.InvolvedLateralOnly:
		aootaCode = domain.AOOTAA1
		notes = append(notes, "Fractura unifocal/aislada lateral")
	case domain.InvolvedBifocal, domain.InvolvedLateralMedial:
		aootaCode = domain.AOOTAA2
		notes = append(notes, "Fractura bifocal (lateral y medial)")
	case domain.InvolvedTrifocal, domain.InvolvedLateralMedialPosterior:
		aootaCode = domain.AOOTAA3
		notes = append(notes, "Fractura trifocal (lateral, medial y posterior)")
		if input.PosteriorType != "" {
			result.Bartonicek = getBartonicekClassification(input.PosteriorType)
		}
	default:
		aootaCode = domain.AOOTAA1
	}

	result.AOOTA = &domain.AOOTAClassification{
		Code:        aootaCode,
		Description: getAOOTADescription(aootaCode),
	}
	result.Notes = notes
	return result, nil
}

// classifyPAWeberB handles PA classification with Weber B
func (e *Engine) classifyPAWeberB(input domain.FractureInput, notes []string, result *domain.ClassificationResult) (*domain.ClassificationResult, error) {
	var aootaCode domain.AOOTACode

	switch input.InvolvedMalleoli {
	case domain.InvolvedUnifocal, domain.InvolvedLateralOnly:
		aootaCode = domain.AOOTAB1
		notes = append(notes, "Fractura aislada lateral")
	case domain.InvolvedBifocal, domain.InvolvedLateralMedial:
		aootaCode = domain.AOOTAB2
		notes = append(notes, "Fractura de maléolos lateral y medial")
	case domain.InvolvedTrifocal, domain.InvolvedLateralMedialPosterior:
		aootaCode = domain.AOOTAB3
		notes = append(notes, "Fractura de maléolos lateral, medial y posterior")
		if input.PosteriorType != "" {
			result.Bartonicek = getBartonicekClassification(input.PosteriorType)
		}
	default:
		aootaCode = domain.AOOTAB1
	}

	result.AOOTA = &domain.AOOTAClassification{
		Code:        aootaCode,
		Description: getAOOTADescription(aootaCode),
	}
	result.Notes = notes
	return result, nil
}

// classifyWeberC handles Weber C classifications
func (e *Engine) classifyWeberC(input domain.FractureInput, notes []string, lhType domain.LaugeHansenType) (*domain.ClassificationResult, error) {
	result := &domain.ClassificationResult{}

	result.DanisWeber = &domain.DanisWeberClassification{
		Type:        domain.DanisWeberC,
		Description: getDanisWeberDescription(domain.DanisWeberC),
	}
	result.LaugeHansen = &domain.LaugeHansenClassification{
		Type:        lhType,
		FullName:    getLaugeHansenFullName(lhType),
		Description: getLaugeHansenDescription(lhType),
	}

	// AO classification based on fracture type
	var aootaCode domain.AOOTACode
	fractureType := input.SuprasindesmalType
	if fractureType == "" {
		// For complex path, check InvolvedMalleoli for type hint
		switch input.InvolvedMalleoli {
		case domain.InvolvedUnifocal, domain.InvolvedLateralOnly:
			fractureType = domain.WeberCSimpleDiaphyseal
		case domain.InvolvedBifocal, domain.InvolvedLateralMedial:
			fractureType = domain.WeberCMultifragmentary
		case domain.InvolvedTrifocal, domain.InvolvedLateralMedialPosterior:
			fractureType = domain.WeberCProximal
		default:
			fractureType = domain.WeberCSimpleDiaphyseal
		}
	}

	switch fractureType {
	case domain.WeberCSimpleDiaphyseal:
		aootaCode = domain.AOOTAC1
		notes = append(notes, "Fractura diafisaria simple")
	case domain.WeberCMultifragmentary:
		aootaCode = domain.AOOTAC2
		notes = append(notes, "Fractura multifragmentaria")
	case domain.WeberCProximal:
		aootaCode = domain.AOOTAC3
		notes = append(notes, "Fractura proximal (Maisonneuve)")
	default:
		aootaCode = domain.AOOTAC1
	}

	result.AOOTA = &domain.AOOTAClassification{
		Code:        aootaCode,
		Description: getAOOTADescription(aootaCode),
	}

	result.Notes = notes
	return result, nil
}

// Helper functions for descriptions

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
		domain.AOOTAA1: "44-A1: Fractura infrasindesmal aislada/unifocal del maléolo lateral (peroné)",
		domain.AOOTAA2: "44-A2: Fractura infrasindesmal bifocal del maléolo lateral con afectación medial",
		domain.AOOTAA3: "44-A3: Fractura infrasindesmal trifocal del maléolo lateral con afectación medial y posterior",
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

func getBartonicekClassification(t domain.BartonicekType) *domain.BartonicekClassification {
	descriptions := map[domain.BartonicekType]string{
		domain.BartonicekType1: "Tipo 1: Fragmento extraincisural - pequeño fragmento fuera de la incisura peronea",
		domain.BartonicekType2: "Tipo 2: Fragmento posterolateral - afecta la incisura peronea",
		domain.BartonicekType3: "Tipo 3: Fragmento posteromedial y posterolateral - extensión medial adicional",
		domain.BartonicekType4: "Tipo 4: Gran fragmento triangular posterolateral - compromete gran parte de la superficie articular",
	}
	return &domain.BartonicekClassification{
		Type:        t,
		Description: descriptions[t],
	}
}
