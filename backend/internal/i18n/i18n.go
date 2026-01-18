package i18n

import (
	"net/http"
	"strings"
)

// Language represents a supported language
type Language string

const (
	English Language = "en"
	Spanish Language = "es"
)

// DefaultLanguage is the fallback language
const DefaultLanguage = English

// ParseLanguage parses a language string into a Language
func ParseLanguage(lang string) Language {
	switch strings.ToLower(strings.TrimSpace(lang)) {
	case "es", "es-es", "es-mx", "es-ar":
		return Spanish
	default:
		return English
	}
}

// ParseAcceptLanguage parses the Accept-Language header
func ParseAcceptLanguage(header string) Language {
	if header == "" {
		return DefaultLanguage
	}

	// Simple parsing: take the first language
	parts := strings.Split(header, ",")
	if len(parts) > 0 {
		lang := strings.TrimSpace(strings.Split(parts[0], ";")[0])
		return ParseLanguage(lang)
	}

	return DefaultLanguage
}

// GetLanguageFromRequest extracts the language from an HTTP request
// Checks Accept-Language header and ?lang= query parameter
func GetLanguageFromRequest(r *http.Request) Language {
	// Query parameter takes precedence
	if lang := r.URL.Query().Get("lang"); lang != "" {
		return ParseLanguage(lang)
	}

	// Fall back to Accept-Language header
	return ParseAcceptLanguage(r.Header.Get("Accept-Language"))
}

// Translation keys
const (
	// Error messages
	KeyErrorInvalidInput       = "error.invalid_input"
	KeyErrorClassification     = "error.classification"
	KeyErrorNoFracturesFound   = "error.no_fractures"
	KeyErrorIsolatedPosterior  = "error.isolated_posterior"

	// Form questions
	KeyQuestionMalleoli          = "question.malleoli"
	KeyQuestionMalleoliDesc      = "question.malleoli_desc"
	KeyQuestionPosteriorType     = "question.posterior_type"
	KeyQuestionPosteriorTypeDesc = "question.posterior_type_desc"
	KeyQuestionFibularLevel      = "question.fibular_level"
	KeyQuestionFibularLevelDesc  = "question.fibular_level_desc"
	KeyQuestionMedialMorphology  = "question.medial_morphology"
	KeyQuestionMedialMorphDesc   = "question.medial_morph_desc"
	KeyQuestionFibulaTransverse  = "question.fibula_transverse"
	KeyQuestionFibularMorphology = "question.fibular_morphology"
	KeyQuestionWeberCType        = "question.weber_c_type"
	KeyQuestionInvolvedMalleoli  = "question.involved_malleoli"

	// Option labels - Medial morphology
	KeyOptionMedialObliqueVertical = "option.medial.oblique_vertical"
	KeyOptionMedialTransverse      = "option.medial.transverse"
	KeyOptionMedialDoubtful        = "option.medial.doubtful"

	// Option labels - Fibular level
	KeyOptionFibularInfrasindesmal     = "option.fibular.infrasindesmal"
	KeyOptionFibularTransindesmal      = "option.fibular.transindesmal"
	KeyOptionFibularSuprasindesmalHigh = "option.fibular.suprasindesmal_high"
	KeyOptionFibularDoubtful           = "option.fibular.doubtful"

	// Option labels - Fibular morphology
	KeyOptionFibularMorphTransverse = "option.fibular_morph.transverse"
	KeyOptionFibularMorphOblique    = "option.fibular_morph.oblique"
	KeyOptionFibularMorphSpiral     = "option.fibular_morph.spiral"

	// Option labels - Weber C fracture type
	KeyOptionWeberCSimple        = "option.weber_c.simple"
	KeyOptionWeberCMultifragment = "option.weber_c.multifragmentary"
	KeyOptionWeberCProximal      = "option.weber_c.proximal"

	// Option labels - Involved malleoli (SA)
	KeyOptionInvolvedUnifocal = "option.involved_sa.unifocal"
	KeyOptionInvolvedBifocal  = "option.involved_sa.bifocal"
	KeyOptionInvolvedTrifocal = "option.involved_sa.trifocal"

	// Option labels - Involved malleoli (SER)
	KeyOptionInvolvedLateralOnly     = "option.involved_ser.lateral_only"
	KeyOptionInvolvedLateralMedial   = "option.involved_ser.lateral_medial"
	KeyOptionInvolvedLateralMedialPost = "option.involved_ser.lateral_medial_posterior"

	// Option labels - Bartonicek
	KeyOptionBartonicek1 = "option.bartonicek.type_1"
	KeyOptionBartonicek2 = "option.bartonicek.type_2"
	KeyOptionBartonicek3 = "option.bartonicek.type_3"
	KeyOptionBartonicek4 = "option.bartonicek.type_4"

	// Checkbox labels
	KeyLabelMedialMalleolus    = "label.medial_malleolus"
	KeyLabelLateralMalleolus   = "label.lateral_malleolus"
	KeyLabelPosteriorMalleolus = "label.posterior_malleolus"
	KeyLabelYes                = "label.yes"
	KeyLabelNo                 = "label.no"

	// Lauge-Hansen names and descriptions
	KeyLHSAName  = "lh.sa.name"
	KeyLHSADesc  = "lh.sa.desc"
	KeyLHSERName = "lh.ser.name"
	KeyLHSERDesc = "lh.ser.desc"
	KeyLHPERName = "lh.per.name"
	KeyLHPERDesc = "lh.per.desc"
	KeyLHPAName  = "lh.pa.name"
	KeyLHPADesc  = "lh.pa.desc"

	// Danis-Weber descriptions
	KeyDWADesc = "dw.a.desc"
	KeyDWBDesc = "dw.b.desc"
	KeyDWCDesc = "dw.c.desc"

	// AO/OTA descriptions
	KeyAOA1Desc = "ao.a1.desc"
	KeyAOA2Desc = "ao.a2.desc"
	KeyAOA3Desc = "ao.a3.desc"
	KeyAOB1Desc = "ao.b1.desc"
	KeyAOB2Desc = "ao.b2.desc"
	KeyAOB3Desc = "ao.b3.desc"
	KeyAOC1Desc = "ao.c1.desc"
	KeyAOC2Desc = "ao.c2.desc"
	KeyAOC3Desc = "ao.c3.desc"

	// Bartonicek descriptions
	KeyBart1Desc = "bartonicek.type_1.desc"
	KeyBart2Desc = "bartonicek.type_2.desc"
	KeyBart3Desc = "bartonicek.type_3.desc"
	KeyBart4Desc = "bartonicek.type_4.desc"

	// Clinical notes
	KeyNoteIsolatedPosterior       = "note.isolated_posterior"
	KeyNoteNoFractures             = "note.no_fractures"
	KeyNoteUnimaleolarMedial       = "note.unimaleolar_medial"
	KeyNoteIsolatedMedialDesc      = "note.isolated_medial_desc"
	KeyNoteBimaleolarMedialPost    = "note.bimaleolar_medial_posterior"
	KeyNoteMedialPostDesc          = "note.medial_post_desc"
	KeyNoteIsolatedLateral         = "note.isolated_lateral"
	KeyNoteInfrasindesmal          = "note.infrasindesmal"
	KeyNoteTransindesmal           = "note.transindesmal"
	KeyNoteSuprasindesmalHigh      = "note.suprasindesmal_high"
	KeyNoteSimpleDiaphyseal        = "note.simple_diaphyseal"
	KeyNoteMultifragmentary        = "note.multifragmentary"
	KeyNoteProximalMaisonneuve     = "note.proximal_maisonneuve"
	KeyNoteLateralWithPosterior    = "note.lateral_with_posterior"
	KeyNoteMedialLateralInvolved   = "note.medial_lateral_involved"
	KeyNoteObliqueVerticalMedial   = "note.oblique_vertical_medial"
	KeyNoteTransverseFibula        = "note.transverse_fibula"
	KeyNoteTransverseMedial        = "note.transverse_medial"
	KeyNoteDoubtfulMedial          = "note.doubtful_medial"
	KeyNoteSuprasindesmalHighFib   = "note.suprasindesmal_high_fib"
	KeyNoteTransindesmalFib        = "note.transindesmal_fib"
	KeyNoteDoubtfulFibLevel        = "note.doubtful_fib_level"
	KeyNoteInfrasindesmalFib       = "note.infrasindesmal_fib"
	KeyNoteTransverseFibMorph      = "note.transverse_fib_morph"
	KeyNoteObliqueFibMorph         = "note.oblique_fib_morph"
	KeyNoteSpiralFibMorph          = "note.spiral_fib_morph"
	KeyNoteUnifocalLateral         = "note.unifocal_lateral"
	KeyNoteBifocalLateralMedial    = "note.bifocal_lateral_medial"
	KeyNoteTrifocalAll             = "note.trifocal_all"
	KeyNoteIsolatedLateralOnly     = "note.isolated_lateral_only"
	KeyNoteLateralMedialMalleoli   = "note.lateral_medial_malleoli"
	KeyNoteLateralMedialPosterior  = "note.lateral_medial_posterior"
	KeyNoteObliqueInfrasindesmal   = "note.oblique_infrasindesmal"
	KeyNoteObliqueTransindesmal    = "note.oblique_transindesmal"
	KeyNoteObliqueSuprasindesmal   = "note.oblique_suprasindesmal"
	KeyNoteUnifocalIsolatedLateral = "note.unifocal_isolated_lateral"
	KeyNoteBifocalLatMed           = "note.bifocal_lat_med"
	KeyNoteTrifocalLatMedPost      = "note.trifocal_lat_med_post"
	KeyNoteIsolatedLateralFracture = "note.isolated_lateral_fracture"
)

// T returns the translation for the given key and language
func T(lang Language, key string) string {
	var translations map[string]string
	switch lang {
	case Spanish:
		translations = spanishTranslations
	default:
		translations = englishTranslations
	}

	if val, ok := translations[key]; ok {
		return val
	}

	// Fallback to English
	if val, ok := englishTranslations[key]; ok {
		return val
	}

	return key
}
