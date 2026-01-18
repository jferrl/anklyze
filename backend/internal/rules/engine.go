package rules

import (
	"github.com/jferrl/fratures/internal/domain"
	"github.com/jferrl/fratures/internal/i18n"
)

// Engine is the rule engine that classifies ankle fractures
type Engine struct{}

// NewEngine creates a new rule engine
func NewEngine() *Engine {
	return &Engine{}
}

// Classify applies the classification rules based on the decision tree from the flow diagram
// The flow starts with: "Does patient have medial malleolus fracture?"
func (e *Engine) Classify(input domain.FractureInput, lang i18n.Language) (*domain.ClassificationResult, error) {
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
				notes = append(notes, i18n.T(lang, i18n.KeyNoteIsolatedPosterior))
				result.Bartonicek = getBartonicekClassification(input.PosteriorFractureType, lang)
				result.Notes = notes
				return result, nil
			}
			// No fractures at all - shouldn't happen
			notes = append(notes, i18n.T(lang, i18n.KeyNoteNoFractures))
			result.Notes = notes
			return result, nil
		}

		// Has lateral, no medial → Check if only lateral
		if !hasPosterior {
			// Only lateral (no medial, no posterior)
			return e.classifyLateralOnly(input, notes, lang)
		}

		// Has lateral + posterior (no medial) → Complex path
		return e.classifyComplexPath(input, notes, lang)
	}

	// PATH 2: Has medial fracture
	if !hasLateral && !hasPosterior {
		// Only medial
		notes = append(notes, i18n.T(lang, i18n.KeyNoteUnimaleolarMedial))
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Type:        domain.LaugeHansenPER,
			FullName:    getLaugeHansenFullName(domain.LaugeHansenPER, lang),
			Description: i18n.T(lang, i18n.KeyNoteIsolatedMedialDesc),
		}
		result.AOOTA = &domain.AOOTAClassification{
			Code:        domain.AOOTAA1,
			Description: getAOOTADescription(domain.AOOTAA1, lang),
		}
		result.Notes = notes
		return result, nil
	}

	if !hasLateral && hasPosterior {
		// Medial + Posterior (no lateral)
		notes = append(notes, i18n.T(lang, i18n.KeyNoteBimaleolarMedialPost))
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Type:        domain.LaugeHansenPA,
			FullName:    getLaugeHansenFullName(domain.LaugeHansenPA, lang),
			Description: i18n.T(lang, i18n.KeyNoteMedialPostDesc),
		}
		result.AOOTA = &domain.AOOTAClassification{
			Code:        domain.AOOTAA2,
			Description: getAOOTADescription(domain.AOOTAA2, lang),
		}
		result.Notes = notes
		return result, nil
	}

	// PATH 3: Medial + Lateral (± Posterior) → Complex path with medial morphology
	return e.classifyComplexPath(input, notes, lang)
}

// classifyLateralOnly handles the lateral-only fracture path
func (e *Engine) classifyLateralOnly(input domain.FractureInput, notes []string, lang i18n.Language) (*domain.ClassificationResult, error) {
	result := &domain.ClassificationResult{}
	notes = append(notes, i18n.T(lang, i18n.KeyNoteIsolatedLateral))

	level := input.LateralFractureLevel

	switch level {
	case domain.FibularLevelInfrasindesmal:
		// Infrasyndesmal → Weber A, AO-44-A1, LH SA
		notes = append(notes, i18n.T(lang, i18n.KeyNoteInfrasindesmal))
		result.DanisWeber = &domain.DanisWeberClassification{
			Type:        domain.DanisWeberA,
			Description: getDanisWeberDescription(domain.DanisWeberA, lang),
		}
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Type:        domain.LaugeHansenSA,
			FullName:    getLaugeHansenFullName(domain.LaugeHansenSA, lang),
			Description: getLaugeHansenDescription(domain.LaugeHansenSA, lang),
		}
		result.AOOTA = &domain.AOOTAClassification{
			Code:        domain.AOOTAA1,
			Description: getAOOTADescription(domain.AOOTAA1, lang),
		}

	case domain.FibularLevelTransindesmal:
		// Transsyndesmal → Weber B, AO-44-B1, LH SER
		notes = append(notes, i18n.T(lang, i18n.KeyNoteTransindesmal))
		result.DanisWeber = &domain.DanisWeberClassification{
			Type:        domain.DanisWeberB,
			Description: getDanisWeberDescription(domain.DanisWeberB, lang),
		}
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Type:        domain.LaugeHansenSER,
			FullName:    getLaugeHansenFullName(domain.LaugeHansenSER, lang),
			Description: getLaugeHansenDescription(domain.LaugeHansenSER, lang),
		}
		result.AOOTA = &domain.AOOTAClassification{
			Code:        domain.AOOTAB1,
			Description: getAOOTADescription(domain.AOOTAB1, lang),
		}

	case domain.FibularLevelSuprasindesmalHigh:
		// Suprasyndesmal → Weber C, LH PER, AO based on type
		notes = append(notes, i18n.T(lang, i18n.KeyNoteSuprasindesmalHigh))
		result.DanisWeber = &domain.DanisWeberClassification{
			Type:        domain.DanisWeberC,
			Description: getDanisWeberDescription(domain.DanisWeberC, lang),
		}
		result.LaugeHansen = &domain.LaugeHansenClassification{
			Type:        domain.LaugeHansenPER,
			FullName:    getLaugeHansenFullName(domain.LaugeHansenPER, lang),
			Description: getLaugeHansenDescription(domain.LaugeHansenPER, lang),
		}

		// AO classification based on fracture type
		var aootaCode domain.AOOTACode
		switch input.SuprasindesmalType {
		case domain.WeberCSimpleDiaphyseal:
			aootaCode = domain.AOOTAC1
			notes = append(notes, i18n.T(lang, i18n.KeyNoteSimpleDiaphyseal))
		case domain.WeberCMultifragmentary:
			aootaCode = domain.AOOTAC2
			notes = append(notes, i18n.T(lang, i18n.KeyNoteMultifragmentary))
		case domain.WeberCProximal:
			aootaCode = domain.AOOTAC3
			notes = append(notes, i18n.T(lang, i18n.KeyNoteProximalMaisonneuve))
		default:
			aootaCode = domain.AOOTAC1
		}
		result.AOOTA = &domain.AOOTAClassification{
			Code:        aootaCode,
			Description: getAOOTADescription(aootaCode, lang),
		}
	}

	result.Notes = notes
	return result, nil
}

// classifyComplexPath handles the complex path (medial+lateral or lateral+posterior)
func (e *Engine) classifyComplexPath(input domain.FractureInput, notes []string, lang i18n.Language) (*domain.ClassificationResult, error) {
	// If has medial, start with medial morphology check
	if input.HasMedialFracture {
		return e.classifyWithMedialMorphology(input, notes, lang)
	}

	// No medial, has lateral + posterior → Follow fibular level path
	notes = append(notes, i18n.T(lang, i18n.KeyNoteLateralWithPosterior))
	return e.classifyByFibularLevel(input, notes, lang)
}

// classifyWithMedialMorphology handles cases where medial morphology determines the path
func (e *Engine) classifyWithMedialMorphology(input domain.FractureInput, notes []string, lang i18n.Language) (*domain.ClassificationResult, error) {
	notes = append(notes, i18n.T(lang, i18n.KeyNoteMedialLateralInvolved))

	switch input.MedialMorphology {
	case domain.MedialMorphologyObliqueVertical:
		// Oblique/vertical medial → Check if fibula is transverse
		notes = append(notes, i18n.T(lang, i18n.KeyNoteObliqueVerticalMedial))

		if input.FibulaTransverse != nil && *input.FibulaTransverse {
			// Transverse fibula → SA classification path
			notes = append(notes, i18n.T(lang, i18n.KeyNoteTransverseFibula))
			return e.classifySA(input, notes, lang)
		}
		// Non-transverse fibula → Check fibular morphology
		return e.classifyByFibularMorphology(input, notes, lang)

	case domain.MedialMorphologyTransverse, domain.MedialMorphologyDoubtful:
		// Transverse or doubtful medial → Check fibular morphology
		if input.MedialMorphology == domain.MedialMorphologyTransverse {
			notes = append(notes, i18n.T(lang, i18n.KeyNoteTransverseMedial))
		} else {
			notes = append(notes, i18n.T(lang, i18n.KeyNoteDoubtfulMedial))
		}
		return e.classifyByFibularLevel(input, notes, lang)
	}

	// Default: classify by fibular level
	return e.classifyByFibularLevel(input, notes, lang)
}

// classifyByFibularLevel handles classification based on fibular level
func (e *Engine) classifyByFibularLevel(input domain.FractureInput, notes []string, lang i18n.Language) (*domain.ClassificationResult, error) {
	level := input.FibularLevel

	switch level {
	case domain.FibularLevelSuprasindesmalHigh:
		// Suprasyndesmal high → Weber C / PER
		notes = append(notes, i18n.T(lang, i18n.KeyNoteSuprasindesmalHighFib))
		return e.classifyWeberC(input, notes, domain.LaugeHansenPER, lang)

	case domain.FibularLevelTransindesmal, domain.FibularLevelDoubtful:
		// Transsyndesmal or doubtful → Check fibular morphology
		if level == domain.FibularLevelTransindesmal {
			notes = append(notes, i18n.T(lang, i18n.KeyNoteTransindesmalFib))
		} else {
			notes = append(notes, i18n.T(lang, i18n.KeyNoteDoubtfulFibLevel))
		}
		return e.classifyByFibularMorphology(input, notes, lang)

	case domain.FibularLevelInfrasindesmal:
		// Infrasyndesmal → Check if transverse
		notes = append(notes, i18n.T(lang, i18n.KeyNoteInfrasindesmalFib))
		if input.FibularTransverse != nil && *input.FibularTransverse {
			// Transverse → SA classification
			notes = append(notes, i18n.T(lang, i18n.KeyNoteTransverseFibula))
			return e.classifySA(input, notes, lang)
		}
		// Not transverse → Check morphology
		return e.classifyByFibularMorphology(input, notes, lang)
	}

	// Default to morphology check
	return e.classifyByFibularMorphology(input, notes, lang)
}

// classifyByFibularMorphology handles classification based on fibular morphology
func (e *Engine) classifyByFibularMorphology(input domain.FractureInput, notes []string, lang i18n.Language) (*domain.ClassificationResult, error) {
	morphology := input.FibularMorphology

	switch morphology {
	case domain.FibularMorphologyTransverse:
		// Transverse → SA classification
		notes = append(notes, i18n.T(lang, i18n.KeyNoteTransverseFibMorph))
		return e.classifySA(input, notes, lang)

	case domain.FibularMorphologyOblique:
		// Oblique → Check level for PA classification
		notes = append(notes, i18n.T(lang, i18n.KeyNoteObliqueFibMorph))
		return e.classifyObliqueFibula(input, notes, lang)

	case domain.FibularMorphologySpiral:
		// Spiral → SER classification
		notes = append(notes, i18n.T(lang, i18n.KeyNoteSpiralFibMorph))
		return e.classifySER(input, notes, lang)
	}

	// Default to SER
	return e.classifySER(input, notes, lang)
}

// classifySA handles SA (Supination-Adduction) classification
func (e *Engine) classifySA(input domain.FractureInput, notes []string, lang i18n.Language) (*domain.ClassificationResult, error) {
	result := &domain.ClassificationResult{}

	result.LaugeHansen = &domain.LaugeHansenClassification{
		Type:        domain.LaugeHansenSA,
		FullName:    getLaugeHansenFullName(domain.LaugeHansenSA, lang),
		Description: getLaugeHansenDescription(domain.LaugeHansenSA, lang),
	}
	result.DanisWeber = &domain.DanisWeberClassification{
		Type:        domain.DanisWeberA,
		Description: getDanisWeberDescription(domain.DanisWeberA, lang),
	}

	// AO classification based on involved malleoli
	var aootaCode domain.AOOTACode
	switch input.InvolvedMalleoli {
	case domain.InvolvedUnifocal:
		aootaCode = domain.AOOTAA1
		notes = append(notes, i18n.T(lang, i18n.KeyNoteUnifocalLateral))
	case domain.InvolvedBifocal:
		aootaCode = domain.AOOTAA2
		notes = append(notes, i18n.T(lang, i18n.KeyNoteBifocalLateralMedial))
	case domain.InvolvedTrifocal:
		aootaCode = domain.AOOTAA3
		notes = append(notes, i18n.T(lang, i18n.KeyNoteTrifocalAll))
	default:
		aootaCode = domain.AOOTAA1
	}

	result.AOOTA = &domain.AOOTAClassification{
		Code:        aootaCode,
		Description: getAOOTADescription(aootaCode, lang),
	}

	result.Notes = notes
	return result, nil
}

// classifySER handles SER (Supination-External Rotation) classification
func (e *Engine) classifySER(input domain.FractureInput, notes []string, lang i18n.Language) (*domain.ClassificationResult, error) {
	result := &domain.ClassificationResult{}

	result.LaugeHansen = &domain.LaugeHansenClassification{
		Type:        domain.LaugeHansenSER,
		FullName:    getLaugeHansenFullName(domain.LaugeHansenSER, lang),
		Description: getLaugeHansenDescription(domain.LaugeHansenSER, lang),
	}
	result.DanisWeber = &domain.DanisWeberClassification{
		Type:        domain.DanisWeberB,
		Description: getDanisWeberDescription(domain.DanisWeberB, lang),
	}

	// AO classification based on involved malleoli
	var aootaCode domain.AOOTACode
	switch input.InvolvedMalleoli {
	case domain.InvolvedLateralOnly:
		aootaCode = domain.AOOTAB1
		notes = append(notes, i18n.T(lang, i18n.KeyNoteIsolatedLateralOnly))
	case domain.InvolvedLateralMedial:
		aootaCode = domain.AOOTAB2
		notes = append(notes, i18n.T(lang, i18n.KeyNoteLateralMedialMalleoli))
	case domain.InvolvedLateralMedialPosterior:
		aootaCode = domain.AOOTAB3
		notes = append(notes, i18n.T(lang, i18n.KeyNoteLateralMedialPosterior))
		// Add Bartonicek if posterior is involved
		if input.PosteriorType != "" {
			result.Bartonicek = getBartonicekClassification(input.PosteriorType, lang)
		}
	default:
		aootaCode = domain.AOOTAB1
	}

	result.AOOTA = &domain.AOOTAClassification{
		Code:        aootaCode,
		Description: getAOOTADescription(aootaCode, lang),
	}

	result.Notes = notes
	return result, nil
}

// classifyObliqueFibula handles oblique fibula morphology → PA classification
func (e *Engine) classifyObliqueFibula(input domain.FractureInput, notes []string, lang i18n.Language) (*domain.ClassificationResult, error) {
	result := &domain.ClassificationResult{}

	level := input.ObliqueFibularLevel
	if level == "" {
		level = input.FibularLevel
	}

	result.LaugeHansen = &domain.LaugeHansenClassification{
		Type:        domain.LaugeHansenPA,
		FullName:    getLaugeHansenFullName(domain.LaugeHansenPA, lang),
		Description: getLaugeHansenDescription(domain.LaugeHansenPA, lang),
	}

	switch level {
	case domain.FibularLevelInfrasindesmal:
		// Infrasyndesmal oblique → Weber A
		notes = append(notes, i18n.T(lang, i18n.KeyNoteObliqueInfrasindesmal))
		result.DanisWeber = &domain.DanisWeberClassification{
			Type:        domain.DanisWeberA,
			Description: getDanisWeberDescription(domain.DanisWeberA, lang),
		}
		return e.classifyPAWeberA(input, notes, result, lang)

	case domain.FibularLevelTransindesmal:
		// Transsyndesmal oblique → Weber B
		notes = append(notes, i18n.T(lang, i18n.KeyNoteObliqueTransindesmal))
		result.DanisWeber = &domain.DanisWeberClassification{
			Type:        domain.DanisWeberB,
			Description: getDanisWeberDescription(domain.DanisWeberB, lang),
		}
		return e.classifyPAWeberB(input, notes, result, lang)

	case domain.FibularLevelSuprasindesmalHigh:
		// Suprasyndesmal oblique → Weber C
		notes = append(notes, i18n.T(lang, i18n.KeyNoteObliqueSuprasindesmal))
		return e.classifyWeberC(input, notes, domain.LaugeHansenPA, lang)
	}

	// Default to Weber B
	result.DanisWeber = &domain.DanisWeberClassification{
		Type:        domain.DanisWeberB,
		Description: getDanisWeberDescription(domain.DanisWeberB, lang),
	}
	return e.classifyPAWeberB(input, notes, result, lang)
}

// classifyPAWeberA handles PA classification with Weber A
func (e *Engine) classifyPAWeberA(input domain.FractureInput, notes []string, result *domain.ClassificationResult, lang i18n.Language) (*domain.ClassificationResult, error) {
	var aootaCode domain.AOOTACode

	switch input.InvolvedMalleoli {
	case domain.InvolvedUnifocal, domain.InvolvedLateralOnly:
		aootaCode = domain.AOOTAA1
		notes = append(notes, i18n.T(lang, i18n.KeyNoteUnifocalIsolatedLateral))
	case domain.InvolvedBifocal, domain.InvolvedLateralMedial:
		aootaCode = domain.AOOTAA2
		notes = append(notes, i18n.T(lang, i18n.KeyNoteBifocalLatMed))
	case domain.InvolvedTrifocal, domain.InvolvedLateralMedialPosterior:
		aootaCode = domain.AOOTAA3
		notes = append(notes, i18n.T(lang, i18n.KeyNoteTrifocalLatMedPost))
		if input.PosteriorType != "" {
			result.Bartonicek = getBartonicekClassification(input.PosteriorType, lang)
		}
	default:
		aootaCode = domain.AOOTAA1
	}

	result.AOOTA = &domain.AOOTAClassification{
		Code:        aootaCode,
		Description: getAOOTADescription(aootaCode, lang),
	}
	result.Notes = notes
	return result, nil
}

// classifyPAWeberB handles PA classification with Weber B
func (e *Engine) classifyPAWeberB(input domain.FractureInput, notes []string, result *domain.ClassificationResult, lang i18n.Language) (*domain.ClassificationResult, error) {
	var aootaCode domain.AOOTACode

	switch input.InvolvedMalleoli {
	case domain.InvolvedUnifocal, domain.InvolvedLateralOnly:
		aootaCode = domain.AOOTAB1
		notes = append(notes, i18n.T(lang, i18n.KeyNoteIsolatedLateralFracture))
	case domain.InvolvedBifocal, domain.InvolvedLateralMedial:
		aootaCode = domain.AOOTAB2
		notes = append(notes, i18n.T(lang, i18n.KeyNoteLateralMedialMalleoli))
	case domain.InvolvedTrifocal, domain.InvolvedLateralMedialPosterior:
		aootaCode = domain.AOOTAB3
		notes = append(notes, i18n.T(lang, i18n.KeyNoteLateralMedialPosterior))
		if input.PosteriorType != "" {
			result.Bartonicek = getBartonicekClassification(input.PosteriorType, lang)
		}
	default:
		aootaCode = domain.AOOTAB1
	}

	result.AOOTA = &domain.AOOTAClassification{
		Code:        aootaCode,
		Description: getAOOTADescription(aootaCode, lang),
	}
	result.Notes = notes
	return result, nil
}

// classifyWeberC handles Weber C classifications
func (e *Engine) classifyWeberC(input domain.FractureInput, notes []string, lhType domain.LaugeHansenType, lang i18n.Language) (*domain.ClassificationResult, error) {
	result := &domain.ClassificationResult{}

	result.DanisWeber = &domain.DanisWeberClassification{
		Type:        domain.DanisWeberC,
		Description: getDanisWeberDescription(domain.DanisWeberC, lang),
	}
	result.LaugeHansen = &domain.LaugeHansenClassification{
		Type:        lhType,
		FullName:    getLaugeHansenFullName(lhType, lang),
		Description: getLaugeHansenDescription(lhType, lang),
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
		notes = append(notes, i18n.T(lang, i18n.KeyNoteSimpleDiaphyseal))
	case domain.WeberCMultifragmentary:
		aootaCode = domain.AOOTAC2
		notes = append(notes, i18n.T(lang, i18n.KeyNoteMultifragmentary))
	case domain.WeberCProximal:
		aootaCode = domain.AOOTAC3
		notes = append(notes, i18n.T(lang, i18n.KeyNoteProximalMaisonneuve))
	default:
		aootaCode = domain.AOOTAC1
	}

	result.AOOTA = &domain.AOOTAClassification{
		Code:        aootaCode,
		Description: getAOOTADescription(aootaCode, lang),
	}

	result.Notes = notes
	return result, nil
}

// Helper functions for descriptions

func getLaugeHansenFullName(t domain.LaugeHansenType, lang i18n.Language) string {
	keys := map[domain.LaugeHansenType]string{
		domain.LaugeHansenSA:  i18n.KeyLHSAName,
		domain.LaugeHansenSER: i18n.KeyLHSERName,
		domain.LaugeHansenPER: i18n.KeyLHPERName,
		domain.LaugeHansenPA:  i18n.KeyLHPAName,
	}
	return i18n.T(lang, keys[t])
}

func getLaugeHansenDescription(t domain.LaugeHansenType, lang i18n.Language) string {
	keys := map[domain.LaugeHansenType]string{
		domain.LaugeHansenSA:  i18n.KeyLHSADesc,
		domain.LaugeHansenSER: i18n.KeyLHSERDesc,
		domain.LaugeHansenPER: i18n.KeyLHPERDesc,
		domain.LaugeHansenPA:  i18n.KeyLHPADesc,
	}
	return i18n.T(lang, keys[t])
}

func getDanisWeberDescription(t domain.DanisWeberType, lang i18n.Language) string {
	keys := map[domain.DanisWeberType]string{
		domain.DanisWeberA: i18n.KeyDWADesc,
		domain.DanisWeberB: i18n.KeyDWBDesc,
		domain.DanisWeberC: i18n.KeyDWCDesc,
	}
	return i18n.T(lang, keys[t])
}

func getAOOTADescription(code domain.AOOTACode, lang i18n.Language) string {
	keys := map[domain.AOOTACode]string{
		// Type A
		domain.AOOTAA1: i18n.KeyAOA1Desc,
		domain.AOOTAA2: i18n.KeyAOA2Desc,
		domain.AOOTAA3: i18n.KeyAOA3Desc,
		// Type B
		domain.AOOTAB1: i18n.KeyAOB1Desc,
		domain.AOOTAB2: i18n.KeyAOB2Desc,
		domain.AOOTAB3: i18n.KeyAOB3Desc,
		// Type C
		domain.AOOTAC1: i18n.KeyAOC1Desc,
		domain.AOOTAC2: i18n.KeyAOC2Desc,
		domain.AOOTAC3: i18n.KeyAOC3Desc,
	}
	return i18n.T(lang, keys[code])
}

func getBartonicekClassification(t domain.BartonicekType, lang i18n.Language) *domain.BartonicekClassification {
	keys := map[domain.BartonicekType]string{
		domain.BartonicekType1: i18n.KeyBart1Desc,
		domain.BartonicekType2: i18n.KeyBart2Desc,
		domain.BartonicekType3: i18n.KeyBart3Desc,
		domain.BartonicekType4: i18n.KeyBart4Desc,
	}
	return &domain.BartonicekClassification{
		Type:        t,
		Description: i18n.T(lang, keys[t]),
	}
}
