package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/i18n"
	"github.com/jferrl/anklyze/internal/service"
	"github.com/jferrl/anklyze/internal/timeutil"
	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

// toJSON marshals data to indented JSON string.
// Returns empty JSON object if marshaling fails.
func toJSON(data any) string {
	b, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		slog.Warn("failed to marshal JSON", "error", err, "type", fmt.Sprintf("%T", data))
		return "{}"
	}
	return string(b)
}

// ============================================================================
// classify_fracture tool
// ============================================================================

func newClassifyFractureTool() mcp.Tool {
	return mcp.NewTool("classify_fracture",
		mcp.WithDescription("Classify an ankle fracture according to Danis-Weber, Lauge-Hansen, AO/OTA, and Bartonicek classification systems. Returns comprehensive classification results based on fracture characteristics."),

		// Primary parameter - which malleoli are involved
		mcp.WithString("involved_malleoli",
			mcp.Required(),
			mcp.Description("Which malleoli are fractured. Options: posterior_only, medial_only, lateral_only, medial_posterior, lateral_posterior, lateral_medial, trimaleolar"),
			mcp.Enum("posterior_only", "medial_only", "lateral_only", "medial_posterior", "lateral_posterior", "lateral_medial", "trimaleolar"),
		),

		// Fibular level (for lateral involvement)
		mcp.WithString("fibular_level",
			mcp.Description("Level of fibular fracture relative to syndesmosis. Required for lateral malleolus involvement. Options: infrasindesmal, transindesmal, suprasindesmal"),
			mcp.Enum("infrasindesmal", "transindesmal", "suprasindesmal"),
		),

		// Lateral morphology
		mcp.WithString("lateral_morphology",
			mcp.Description("Morphology/shape of the lateral/fibular fracture. Options: transverse, oblique, spiral"),
			mcp.Enum("transverse", "oblique", "spiral"),
		),

		// Medial morphology
		mcp.WithString("medial_morphology",
			mcp.Description("Morphology of medial malleolus fracture. Options: oblique, transverse"),
			mcp.Enum("oblique", "transverse"),
		),

		// Suprasindesmal type
		mcp.WithString("suprasindesmal_type",
			mcp.Description("Type of suprasindesmal fracture. Required when fibular_level is suprasindesmal. Options: simple_diaphyseal, multifragmentary, proximal"),
			mcp.Enum("simple_diaphyseal", "multifragmentary", "proximal"),
		),

		// Posterior fracture type (Bartonicek)
		mcp.WithString("posterior_fracture_type",
			mcp.Description("Type of posterior malleolus fracture (Bartonicek classification). Required when posterior malleolus is involved and CT scan is available. Options: extraincisural, posterolateral, posteromedial_posterolateral, large_posterolateral"),
			mcp.Enum("extraincisural", "posterolateral", "posteromedial_posterolateral", "large_posterolateral"),
		),

		// CT scan availability
		mcp.WithBoolean("has_ct_scan",
			mcp.Description("Whether CT scan is available. Required for Bartonicek classification of posterior malleolus fractures."),
		),

		// Fibula trace pattern for PA vs PER differentiation
		mcp.WithString("fibula_trace_pattern",
			mcp.Description("Fibula trace pattern for suprasyndesmotic fractures to differentiate PA vs PER mechanism. Options: parasindesmotic_short (PA mechanism), parasindesmotic_long (PER mechanism)"),
			mcp.Enum("parasindesmotic_short", "parasindesmotic_long"),
		),

		// Bimaleolar specific fields
		mcp.WithBoolean("fibula_infrasindesmal_transverse",
			mcp.Description("For bimaleolar lateral+medial: is fibula fracture infrasindesmal AND transverse?"),
		),

		mcp.WithString("fibular_level_for_transverse",
			mcp.Description("Fibular level for transverse morphology cases. Options: infrasindesmal, transindesmal, suprasindesmal"),
			mcp.Enum("infrasindesmal", "transindesmal", "suprasindesmal"),
		),

		// Language
		mcp.WithString("language",
			mcp.Description("Response language. Options: en (English), es (Spanish). Default: en"),
			mcp.Enum("en", "es"),
		),
	)
}

func classifyFractureHandler(classifier service.ClassifierService) server.ToolHandlerFunc {
	return func(_ context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		// Build FractureInput from arguments using SDK helper methods
		hasCTScan := request.GetBool("has_ct_scan", false)
		fibulaInfraTransverse := request.GetBool("fibula_infrasindesmal_transverse", false)

		input := domain.FractureInput{
			InvolvedMalleoli:               domain.InvolvedMalleoli(request.GetString("involved_malleoli", "")),
			FibularLevel:                   domain.FibularLevel(request.GetString("fibular_level", "")),
			LateralMorphology:              domain.LateralMorphology(request.GetString("lateral_morphology", "")),
			MedialMorphology:               domain.MedialMorphology(request.GetString("medial_morphology", "")),
			SuprasindesmalType:             domain.SuprasindesmalType(request.GetString("suprasindesmal_type", "")),
			PosteriorFractureType:          domain.PosteriorFractureType(request.GetString("posterior_fracture_type", "")),
			HasCTScan:                      &hasCTScan,
			FibulaTracePattern:             domain.FibulaTracePattern(request.GetString("fibula_trace_pattern", "")),
			FibulaInfrasindesmalTransverse: &fibulaInfraTransverse,
			FibularLevelForTransverse:      domain.FibularLevel(request.GetString("fibular_level_for_transverse", "")),
		}

		lang := i18n.ParseLanguage(request.GetString("language", "en"))

		result, err := classifier.Classify(input, lang)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("classification error: %v", err)), nil
		}

		return newToolResultJSON(result), nil
	}
}

// ============================================================================
// get_options tool
// ============================================================================

func newGetOptionsTool() mcp.Tool {
	return mcp.NewTool("get_options",
		mcp.WithDescription("Get localized form options and questions for ankle fracture classification. Returns all valid values for each parameter along with their labels."),
		mcp.WithString("language",
			mcp.Description("Language for options. Options: en (English), es (Spanish). Default: en"),
			mcp.Enum("en", "es"),
		),
		mcp.WithString("category",
			mcp.Description("Specific category of options to retrieve. If omitted, returns all options. Options: involved_malleoli, posterior_fracture_types, medial_morphology, fibular_levels, lateral_morphology, suprasindesmal_types, fibula_trace_patterns, questions"),
			mcp.Enum("involved_malleoli", "posterior_fracture_types", "medial_morphology", "fibular_levels", "lateral_morphology", "suprasindesmal_types", "fibula_trace_patterns", "questions"),
		),
	)
}

// SelectOption represents an option for form selects
type SelectOption struct {
	Value string `json:"value"`
	Label string `json:"label"`
}

// Question represents a form question
type Question struct {
	ID    string `json:"id"`
	Title string `json:"title"`
}

// FormOptions represents all available form options
type FormOptions struct {
	Questions              map[string]Question `json:"questions,omitempty"`
	Labels                 map[string]string   `json:"labels,omitempty"`
	InvolvedMalleoli       []SelectOption      `json:"involved_malleoli,omitempty"`
	PosteriorFractureTypes []SelectOption      `json:"posterior_fracture_types,omitempty"`
	MedialMorphology       []SelectOption      `json:"medial_morphology,omitempty"`
	FibularLevels          []SelectOption      `json:"fibular_levels,omitempty"`
	LateralMorphology      []SelectOption      `json:"lateral_morphology,omitempty"`
	SuprasindesmalTypes    []SelectOption      `json:"suprasindesmal_types,omitempty"`
	FibulaTracePatterns    []SelectOption      `json:"fibula_trace_patterns,omitempty"`
}

func getOptionsHandler() server.ToolHandlerFunc {
	return func(_ context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		lang := i18n.ParseLanguage(request.GetString("language", "en"))
		category := request.GetString("category", "")

		options := buildFormOptions(lang)

		// If category specified, return only that category
		if category != "" {
			filtered := filterOptions(options, category)
			return newToolResultJSON(filtered), nil
		}

		return newToolResultJSON(options), nil
	}
}

func buildFormOptions(lang i18n.Language) FormOptions {
	return FormOptions{
		Questions: map[string]Question{
			"involved_malleoli":                {ID: "involved_malleoli", Title: i18n.T(lang, i18n.KeyQuestionMalleoli)},
			"posterior_fracture_type":          {ID: "posterior_fracture_type", Title: i18n.T(lang, i18n.KeyQuestionPosteriorType)},
			"medial_morphology":                {ID: "medial_morphology", Title: i18n.T(lang, i18n.KeyQuestionMedialMorphology)},
			"fibular_level":                    {ID: "fibular_level", Title: i18n.T(lang, i18n.KeyQuestionFibularLevel)},
			"lateral_morphology":               {ID: "lateral_morphology", Title: i18n.T(lang, i18n.KeyQuestionLateralMorphology)},
			"suprasindesmal_type":              {ID: "suprasindesmal_type", Title: i18n.T(lang, i18n.KeyQuestionSuprasindesmalType)},
			"fibula_infrasindesmal_transverse": {ID: "fibula_infrasindesmal_transverse", Title: i18n.T(lang, i18n.KeyQuestionFibulaInfraTransverse)},
			"has_ct_scan":                      {ID: "has_ct_scan", Title: i18n.T(lang, i18n.KeyQuestionHasCTScan)},
			"fibula_trace_pattern":             {ID: "fibula_trace_pattern", Title: i18n.T(lang, i18n.KeyQuestionFibulaTracePattern)},
		},
		Labels: map[string]string{
			"yes":  i18n.T(lang, i18n.KeyLabelYes),
			"no":   i18n.T(lang, i18n.KeyLabelNo),
			"high": i18n.T(lang, i18n.KeyLabelHigh),
			"low":  i18n.T(lang, i18n.KeyLabelLow),
		},
		InvolvedMalleoli: []SelectOption{
			{Value: "posterior_only", Label: i18n.T(lang, i18n.KeyOptionPosteriorOnly)},
			{Value: "medial_only", Label: i18n.T(lang, i18n.KeyOptionMedialOnly)},
			{Value: "lateral_only", Label: i18n.T(lang, i18n.KeyOptionLateralOnly)},
			{Value: "medial_posterior", Label: i18n.T(lang, i18n.KeyOptionMedialPosterior)},
			{Value: "lateral_posterior", Label: i18n.T(lang, i18n.KeyOptionLateralPosterior)},
			{Value: "lateral_medial", Label: i18n.T(lang, i18n.KeyOptionLateralMedial)},
			{Value: "trimaleolar", Label: i18n.T(lang, i18n.KeyOptionTrimaleolar)},
		},
		PosteriorFractureTypes: []SelectOption{
			{Value: "extraincisural", Label: i18n.T(lang, i18n.KeyOptionPosteriorExtraincisural)},
			{Value: "posterolateral", Label: i18n.T(lang, i18n.KeyOptionPosteriorPosterolateral)},
			{Value: "posteromedial_posterolateral", Label: i18n.T(lang, i18n.KeyOptionPosteriorPosteromedialPosterolateral)},
			{Value: "large_posterolateral", Label: i18n.T(lang, i18n.KeyOptionPosteriorLargePosterolateral)},
		},
		MedialMorphology: []SelectOption{
			{Value: "oblique", Label: i18n.T(lang, i18n.KeyOptionMedialOblique)},
			{Value: "transverse", Label: i18n.T(lang, i18n.KeyOptionMedialTransverse)},
		},
		FibularLevels: []SelectOption{
			{Value: "infrasindesmal", Label: i18n.T(lang, i18n.KeyOptionFibularInfrasindesmal)},
			{Value: "transindesmal", Label: i18n.T(lang, i18n.KeyOptionFibularTransindesmal)},
			{Value: "suprasindesmal", Label: i18n.T(lang, i18n.KeyOptionFibularSuprasindesmal)},
		},
		LateralMorphology: []SelectOption{
			{Value: "transverse", Label: i18n.T(lang, i18n.KeyOptionLateralTransverse)},
			{Value: "oblique", Label: i18n.T(lang, i18n.KeyOptionLateralOblique)},
			{Value: "spiral", Label: i18n.T(lang, i18n.KeyOptionLateralSpiral)},
		},
		SuprasindesmalTypes: []SelectOption{
			{Value: "simple_diaphyseal", Label: i18n.T(lang, i18n.KeyOptionSupraSimple)},
			{Value: "multifragmentary", Label: i18n.T(lang, i18n.KeyOptionSupraMultifragmentary)},
			{Value: "proximal", Label: i18n.T(lang, i18n.KeyOptionSupraProximal)},
		},
		FibulaTracePatterns: []SelectOption{
			{Value: "parasindesmotic_short", Label: i18n.T(lang, i18n.KeyOptionFibulaTraceShort)},
			{Value: "parasindesmotic_long", Label: i18n.T(lang, i18n.KeyOptionFibulaTraceLong)},
		},
	}
}

func filterOptions(opts FormOptions, category string) any {
	switch category {
	case "involved_malleoli":
		return map[string]any{"involved_malleoli": opts.InvolvedMalleoli}
	case "posterior_fracture_types":
		return map[string]any{"posterior_fracture_types": opts.PosteriorFractureTypes}
	case "medial_morphology":
		return map[string]any{"medial_morphology": opts.MedialMorphology}
	case "fibular_levels":
		return map[string]any{"fibular_levels": opts.FibularLevels}
	case "lateral_morphology":
		return map[string]any{"lateral_morphology": opts.LateralMorphology}
	case "suprasindesmal_types":
		return map[string]any{"suprasindesmal_types": opts.SuprasindesmalTypes}
	case "fibula_trace_patterns":
		return map[string]any{"fibula_trace_patterns": opts.FibulaTracePatterns}
	case "questions":
		return map[string]any{"questions": opts.Questions}
	default:
		return opts
	}
}

// ============================================================================
// validate_combination tool
// ============================================================================

func newValidateCombinationTool() mcp.Tool {
	return mcp.NewTool("validate_combination",
		mcp.WithDescription("Validate if an ankle fracture combination is anatomically possible. Some combinations like infrasindesmal lateral with posterior malleolus are anatomically impossible."),
		mcp.WithString("involved_malleoli",
			mcp.Required(),
			mcp.Description("Which malleoli are fractured"),
			mcp.Enum("posterior_only", "medial_only", "lateral_only", "medial_posterior", "lateral_posterior", "lateral_medial", "trimaleolar"),
		),
		mcp.WithString("fibular_level",
			mcp.Description("Level of fibular fracture"),
			mcp.Enum("infrasindesmal", "transindesmal", "suprasindesmal"),
		),
		mcp.WithString("lateral_morphology",
			mcp.Description("Morphology of lateral fracture"),
			mcp.Enum("transverse", "oblique", "spiral"),
		),
		mcp.WithString("language",
			mcp.Description("Language for response"),
			mcp.Enum("en", "es"),
		),
	)
}

// ValidationResult represents the result of validating a fracture combination
type ValidationResult struct {
	Valid  bool   `json:"valid"`
	Reason string `json:"reason,omitempty"`
}

func validateCombinationHandler(classifier service.ClassifierService) server.ToolHandlerFunc {
	return func(_ context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		input := domain.FractureInput{
			InvolvedMalleoli:  domain.InvolvedMalleoli(request.GetString("involved_malleoli", "")),
			FibularLevel:      domain.FibularLevel(request.GetString("fibular_level", "")),
			LateralMorphology: domain.LateralMorphology(request.GetString("lateral_morphology", "")),
		}

		lang := i18n.ParseLanguage(request.GetString("language", "en"))

		result, err := classifier.Classify(input, lang)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("validation error: %v", err)), nil
		}

		validation := ValidationResult{
			Valid:  !result.Impossible,
			Reason: result.ImpossibleReason,
		}

		if validation.Valid {
			if lang == i18n.Spanish {
				validation.Reason = "Esta combinacion de fractura es anatomicamente posible."
			} else {
				validation.Reason = "This fracture combination is anatomically possible."
			}
		}

		return newToolResultJSON(validation), nil
	}
}

// ============================================================================
// explain_classification tool
// ============================================================================

func newExplainClassificationTool() mcp.Tool {
	return mcp.NewTool("explain_classification",
		mcp.WithDescription("Explain ankle fracture classification systems or specific classification results. Useful for understanding what each classification means."),
		mcp.WithString("topic",
			mcp.Required(),
			mcp.Description("What to explain: danis_weber, lauge_hansen, ao_ota, bartonicek, or a specific type like 'Weber A', 'SER', '44-B3'"),
		),
		mcp.WithString("language",
			mcp.Description("Language for explanation"),
			mcp.Enum("en", "es"),
		),
	)
}

func explainClassificationHandler() server.ToolHandlerFunc {
	return func(_ context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		topic := request.GetString("topic", "")
		lang := i18n.ParseLanguage(request.GetString("language", "en"))

		explanation := getExplanation(topic, lang)
		return mcp.NewToolResultText(explanation), nil
	}
}

func getExplanation(topic string, lang i18n.Language) string {
	explanations := map[string]map[i18n.Language]string{
		"danis_weber": {
			i18n.English: `# Danis-Weber Classification

The Danis-Weber classification is based on the level of the fibular fracture relative to the ankle syndesmosis:

- **Weber A**: Fracture below the syndesmosis (infrasyndesmal). Usually stable, as the syndesmosis is intact.

- **Weber B**: Fracture at the level of the syndesmosis (transsyndesmal). May or may not involve syndesmosis injury.

- **Weber C**: Fracture above the syndesmosis (suprasyndesmal). Usually involves syndesmosis injury and is unstable.

This classification helps predict injury severity and guide treatment decisions.`,
			i18n.Spanish: `# Clasificacion Danis-Weber

La clasificacion Danis-Weber se basa en el nivel de la fractura del perone en relacion con la sindesmosis:

- **Weber A**: Fractura por debajo de la sindesmosis (infrasindesmal). Generalmente estable, ya que la sindesmosis esta intacta.

- **Weber B**: Fractura a nivel de la sindesmosis (transindesmal). Puede o no involucrar lesion de la sindesmosis.

- **Weber C**: Fractura por encima de la sindesmosis (suprasindesmal). Generalmente involucra lesion de la sindesmosis y es inestable.

Esta clasificacion ayuda a predecir la gravedad de la lesion y guiar las decisiones de tratamiento.`,
		},
		"lauge_hansen": {
			i18n.English: `# Lauge-Hansen Classification

The Lauge-Hansen classification is based on the position of the foot and the direction of the injuring force:

- **SA (Supination-Adduction)**: Foot supinated, adduction force. Results in transverse fibular fracture below syndesmosis.

- **SER (Supination-External Rotation)**: Foot supinated, external rotation force. Most common type. Spiral fibular fracture at syndesmosis level.

- **PER (Pronation-External Rotation)**: Foot pronated, external rotation force. High fibular fracture with syndesmosis injury.

- **PA (Pronation-Abduction)**: Foot pronated, abduction force. Oblique fibular fracture at or above syndesmosis.

Understanding the mechanism helps predict associated injuries and plan treatment.`,
			i18n.Spanish: `# Clasificacion Lauge-Hansen

La clasificacion Lauge-Hansen se basa en la posicion del pie y la direccion de la fuerza lesiva:

- **SA (Supinacion-Aduccion)**: Pie en supinacion, fuerza de aduccion. Resulta en fractura transversa del perone por debajo de la sindesmosis.

- **SER (Supinacion-Rotacion Externa)**: Pie en supinacion, fuerza de rotacion externa. Tipo mas comun. Fractura espiroidea del perone a nivel de la sindesmosis.

- **PER (Pronacion-Rotacion Externa)**: Pie en pronacion, fuerza de rotacion externa. Fractura alta del perone con lesion de la sindesmosis.

- **PA (Pronacion-Abduccion)**: Pie en pronacion, fuerza de abduccion. Fractura oblicua del perone a nivel o por encima de la sindesmosis.

Comprender el mecanismo ayuda a predecir lesiones asociadas y planificar el tratamiento.`,
		},
		"ao_ota": {
			i18n.English: `# AO/OTA Classification

The AO/OTA (Arbeitsgemeinschaft fur Osteosynthesefragen / Orthopaedic Trauma Association) classification for ankle fractures (bone segment 44):

**Type A (44-A)**: Infrasyndesmal fibular fractures
- A1: Isolated lateral malleolus
- A2: With medial malleolus fracture

**Type B (44-B)**: Transsyndesmal fibular fractures
- B1: Isolated lateral malleolus
- B2: With medial lesion
- B3: With medial and posterior fragments

**Type C (44-C)**: Suprasyndesmal fibular fractures
- C1: Simple diaphyseal
- C2: Multifragmentary
- C3: Proximal (Maisonneuve)

This alphanumeric system provides standardized communication among healthcare providers.`,
			i18n.Spanish: `# Clasificacion AO/OTA

La clasificacion AO/OTA para fracturas de tobillo (segmento oseo 44):

**Tipo A (44-A)**: Fracturas infrasindesmal del perone
- A1: Maleolo lateral aislado
- A2: Con fractura del maleolo medial

**Tipo B (44-B)**: Fracturas transindesmal del perone
- B1: Maleolo lateral aislado
- B2: Con lesion medial
- B3: Con fragmentos medial y posterior

**Tipo C (44-C)**: Fracturas suprasindesmal del perone
- C1: Diafisaria simple
- C2: Multifragmentaria
- C3: Proximal (Maisonneuve)

Este sistema alfanumerico proporciona comunicacion estandarizada entre profesionales de la salud.`,
		},
		"bartonicek": {
			i18n.English: `# Bartonicek Classification

The Bartonicek classification specifically addresses posterior malleolus fractures and requires CT imaging:

- **Type 1 (Extraincisural)**: Small posterolateral fragment, does not extend to the incisura fibularis. Usually stable.

- **Type 2 (Posterolateral)**: Posterolateral fragment extending to the incisura. May affect joint stability.

- **Type 3 (Posteromedial + Posterolateral)**: Two-part fracture with both posteromedial and posterolateral fragments. More complex injury.

- **Type 4 (Large Posterolateral)**: Large triangular posterolateral fragment. Most severe, significantly affects stability.

CT scan is essential for accurate classification as standard X-rays may underestimate fracture size.`,
			i18n.Spanish: `# Clasificacion Bartonicek

La clasificacion Bartonicek aborda especificamente las fracturas del maleolo posterior y requiere imagenes de TC:

- **Tipo 1 (Extraincisural)**: Fragmento posterolateral pequeno, no se extiende a la incisura del perone. Generalmente estable.

- **Tipo 2 (Posterolateral)**: Fragmento posterolateral que se extiende a la incisura. Puede afectar la estabilidad articular.

- **Tipo 3 (Posteromedial + Posterolateral)**: Fractura de dos partes con fragmentos posteromedial y posterolateral. Lesion mas compleja.

- **Tipo 4 (Gran Posterolateral)**: Gran fragmento triangular posterolateral. Mas grave, afecta significativamente la estabilidad.

La TC es esencial para una clasificacion precisa ya que las radiografias estandar pueden subestimar el tamano de la fractura.`,
		},
	}

	// Check for system-level explanation
	if exp, ok := explanations[topic]; ok {
		if text, ok := exp[lang]; ok {
			return text
		}
		return exp[i18n.English]
	}

	// Default response for unknown topics
	if lang == i18n.Spanish {
		return fmt.Sprintf("No se encontro explicacion para el tema '%s'. Temas disponibles: danis_weber, lauge_hansen, ao_ota, bartonicek", topic)
	}
	return fmt.Sprintf("No explanation found for topic '%s'. Available topics: danis_weber, lauge_hansen, ao_ota, bartonicek", topic)
}

// ============================================================================
// Analytics tools
// ============================================================================

func newGetAnalyticsSummaryTool() mcp.Tool {
	return mcp.NewTool("get_analytics_summary",
		mcp.WithDescription("Get aggregated analytics summary of fracture classifications for a time period."),
		mcp.WithString("from_date",
			mcp.Description("Start date in YYYY-MM-DD format. Default: 30 days ago"),
		),
		mcp.WithString("to_date",
			mcp.Description("End date in YYYY-MM-DD format. Default: today"),
		),
	)
}

func getAnalyticsSummaryHandler(analytics AnalyticsRepository) server.ToolHandlerFunc {
	return func(_ context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		from, to := parseDateRangeFromRequest(request)

		summary, err := analytics.GetSummary(from, to)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("failed to get analytics summary: %v", err)), nil
		}

		return newToolResultJSON(summary), nil
	}
}

func newGetAnalyticsTrendsTool() mcp.Tool {
	return mcp.NewTool("get_analytics_trends",
		mcp.WithDescription("Get classification trends over time with configurable granularity."),
		mcp.WithString("from_date",
			mcp.Description("Start date in YYYY-MM-DD format. Default: 30 days ago"),
		),
		mcp.WithString("to_date",
			mcp.Description("End date in YYYY-MM-DD format. Default: today"),
		),
		mcp.WithString("granularity",
			mcp.Description("Time granularity for trends: day, week, month. Default: day"),
			mcp.Enum("day", "week", "month"),
		),
	)
}

func getAnalyticsTrendsHandler(analytics AnalyticsRepository) server.ToolHandlerFunc {
	return func(_ context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		from, to := parseDateRangeFromRequest(request)
		granularity := domain.ParseGranularity(request.GetString("granularity", "day"))

		trends, err := analytics.GetTrends(from, to, granularity)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("failed to get analytics trends: %v", err)), nil
		}

		return newToolResultJSON(trends), nil
	}
}

func newGetClassificationDistributionTool() mcp.Tool {
	return mcp.NewTool("get_classification_distribution",
		mcp.WithDescription("Get distribution of classifications for a specific system."),
		mcp.WithString("system",
			mcp.Required(),
			mcp.Description("Classification system to analyze: danis-weber, lauge-hansen, ao-ota"),
			mcp.Enum("danis-weber", "lauge-hansen", "ao-ota"),
		),
		mcp.WithString("from_date",
			mcp.Description("Start date in YYYY-MM-DD format. Default: 30 days ago"),
		),
		mcp.WithString("to_date",
			mcp.Description("End date in YYYY-MM-DD format. Default: today"),
		),
	)
}

func getClassificationDistributionHandler(analytics AnalyticsRepository) server.ToolHandlerFunc {
	return func(_ context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		system := request.GetString("system", "")
		from, to := parseDateRangeFromRequest(request)

		distribution, err := analytics.GetDistribution(system, from, to)
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("failed to get distribution: %v", err)), nil
		}

		return newToolResultJSON(distribution), nil
	}
}

// Helper function to parse date range from request
func parseDateRangeFromRequest(request mcp.CallToolRequest) (time.Time, time.Time) {
	dr := timeutil.ParseDateRange(
		request.GetString("from_date", ""),
		request.GetString("to_date", ""),
	)
	return dr.From, dr.To
}
