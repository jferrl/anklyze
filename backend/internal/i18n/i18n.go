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
	KeyErrorInvalidInput      = "error.invalid_input"
	KeyErrorClassification    = "error.classification"
	KeyErrorNoFracturesFound  = "error.no_fractures"
	KeyErrorIsolatedPosterior = "error.isolated_posterior"
	KeyErrorChatUnavailable   = "error.chat_unavailable"

	// Form questions
	KeyQuestionMalleoli              = "question.malleoli"
	KeyQuestionPosteriorType         = "question.posterior_type"
	KeyQuestionMedialMorphology      = "question.medial_morphology"
	KeyQuestionMedialMorphologyLM    = "question.medial_morphology_lm"
	KeyQuestionFibularLevel          = "question.fibular_level"
	KeyQuestionFibularLevelLM        = "question.fibular_level_lm"
	KeyQuestionFibularLevelTri       = "question.fibular_level_tri"
	KeyQuestionLateralMorphology     = "question.lateral_morphology"
	KeyQuestionSuprasindesmalType    = "question.suprasindesmal_type"
	KeyQuestionFibulaInfraTransverse = "question.fibula_infra_transverse"
	KeyQuestionHasCTScan             = "question.has_ct_scan"
	KeyQuestionFibulaTracePattern    = "question.fibula_trace_pattern"

	// Option labels - Involved malleoli (first question)
	KeyOptionPosteriorOnly    = "option.malleoli.posterior_only"
	KeyOptionMedialOnly       = "option.malleoli.medial_only"
	KeyOptionLateralOnly      = "option.malleoli.lateral_only"
	KeyOptionMedialPosterior  = "option.malleoli.medial_posterior"
	KeyOptionLateralPosterior = "option.malleoli.lateral_posterior"
	KeyOptionLateralMedial    = "option.malleoli.lateral_medial"
	KeyOptionTrimaleolar      = "option.malleoli.trimaleolar"

	// Option labels - Posterior fracture type (Bartonicek)
	KeyOptionPosteriorExtraincisural            = "option.posterior.extraincisural"
	KeyOptionPosteriorPosterolateral            = "option.posterior.posterolateral"
	KeyOptionPosteriorPosteromedialPosterolateral = "option.posterior.posteromedial_posterolateral"
	KeyOptionPosteriorLargePosterolateral       = "option.posterior.large_posterolateral"

	// Option labels - Medial morphology
	KeyOptionMedialOblique    = "option.medial.oblique"
	KeyOptionMedialTransverse = "option.medial.transverse"

	// Option labels - Medial morphology (for lateral+medial path)
	KeyOptionMedialObliqueLM = "option.medial.oblique_lm"

	// Option labels - Fibular level
	KeyOptionFibularInfrasindesmal  = "option.fibular.infrasindesmal"
	KeyOptionFibularTransindesmal   = "option.fibular.transindesmal"
	KeyOptionFibularSuprasindesmal  = "option.fibular.suprasindesmal"

	// Option labels - Lateral morphology
	KeyOptionLateralTransverse = "option.lateral.transverse"
	KeyOptionLateralOblique    = "option.lateral.oblique"
	KeyOptionLateralSpiral     = "option.lateral.spiral"

	// Option labels - Fibula morphology (for lateral+medial and trimaleolar paths)
	KeyOptionFibulaObliqueLMTri = "option.fibula.oblique_lm_tri"

	// Option labels - Suprasindesmal type
	KeyOptionSupraSimple           = "option.supra.simple"
	KeyOptionSupraMultifragmentary = "option.supra.multifragmentary"
	KeyOptionSupraProximal         = "option.supra.proximal"

	// Option labels - Fibula trace pattern
	KeyOptionFibulaTraceShort = "option.fibula_trace.short"
	KeyOptionFibulaTraceLong  = "option.fibula_trace.long"

	// Labels
	KeyLabelYes  = "label.yes"
	KeyLabelNo   = "label.no"
	KeyLabelHigh = "label.high"
	KeyLabelLow  = "label.low"

	// Fracture descriptions
	KeyNoFractureSelected                 = "fracture.none_selected"
	KeyFractureUnimaleolarPosterior       = "fracture.unimaleolar_posterior"
	KeyFractureUnimaleolarMedial          = "fracture.unimaleolar_medial"
	KeyFractureUnimaleolarLateral         = "fracture.unimaleolar_lateral"
	KeyFractureBimaleolarMedialPosterior  = "fracture.bimaleolar_medial_posterior"
	KeyFractureBimaleolarLateralPosterior = "fracture.bimaleolar_lateral_posterior"
	KeyFractureBimaleolarLateralMedial    = "fracture.bimaleolar_lateral_medial"
	KeyFractureTrimaleolar                = "fracture.trimaleolar"

	// Impossible scenarios
	KeyNotPossibleSAMechanism = "impossible.sa_mechanism"
	KeyNotPossibleExceptional = "impossible.exceptional"

	// Lauge-Hansen names and descriptions
	KeyLHSAName        = "lh.sa.name"
	KeyLHSADesc        = "lh.sa.desc"
	KeyLHSERName       = "lh.ser.name"
	KeyLHSERDesc       = "lh.ser.desc"
	KeyLHPERName       = "lh.per.name"
	KeyLHPERDesc       = "lh.per.desc"
	KeyLHPAName        = "lh.pa.name"
	KeyLHPADesc        = "lh.pa.desc"
	KeyLHAmbiguousName        = "lh.ambiguous.name"
	KeyLHAmbiguousDesc        = "lh.ambiguous.desc"
	KeyLHUnclassifiableDesc   = "lh.unclassifiable.desc"

	// Danis-Weber descriptions
	KeyDWADesc = "dw.a.desc"
	KeyDWBDesc = "dw.b.desc"
	KeyDWCDesc = "dw.c.desc"

	// AO/OTA descriptions
	KeyAOA1Desc = "ao.a1.desc"
	KeyAOA2Desc = "ao.a2.desc"
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
