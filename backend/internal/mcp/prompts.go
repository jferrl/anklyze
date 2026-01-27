package mcp

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
)

// ============================================================================
// Clinical Classification Prompt
// ============================================================================

func clinicalClassificationPrompt() mcp.Prompt {
	return mcp.NewPrompt("clinical_classification",
		mcp.WithPromptDescription("Guide clinicians through structured ankle fracture classification with decision support"),
		mcp.WithArgument("case_description",
			mcp.ArgumentDescription("Initial description of the ankle fracture case (e.g., 'Patient with lateral malleolus fracture after fall')"),
		),
		mcp.WithArgument("imaging_available",
			mcp.ArgumentDescription("What imaging is available: xray, ct, or both"),
		),
		mcp.WithArgument("language",
			mcp.ArgumentDescription("Language for interaction: en (English) or es (Spanish)"),
		),
	)
}

func clinicalClassificationHandler(ctx context.Context, request mcp.GetPromptRequest) (*mcp.GetPromptResult, error) {
	args := request.Params.Arguments
	caseDesc := args["case_description"]
	imaging := args["imaging_available"]
	lang := args["language"]
	if lang == "" {
		lang = "en"
	}

	var systemPrompt, userPrompt string

	if lang == "es" {
		systemPrompt = `Eres un asistente de clasificacion de fracturas de tobillo. Tienes acceso a las siguientes herramientas:

1. classify_fracture - Clasifica fracturas de tobillo segun sistemas internacionales
2. get_options - Obtiene opciones validas para cada parametro
3. validate_combination - Valida si una combinacion es anatomicamente posible
4. explain_classification - Explica sistemas de clasificacion

Tu objetivo es ayudar al clinico a:
1. Identificar que maleolos estan fracturados
2. Determinar el nivel del perone (si aplica)
3. Evaluar la morfologia de la fractura
4. Proporcionar clasificaciones Danis-Weber, Lauge-Hansen, AO/OTA y Bartonicek (si hay TC)

Haz preguntas especificas para recopilar la informacion necesaria. Usa las herramientas para validar y clasificar.`

		userPrompt = fmt.Sprintf(`Caso clinico: %s

Imagenes disponibles: %s

Por favor ayudame a clasificar esta fractura de tobillo. Comienza preguntando sobre los maleolos afectados y luego guiame a traves del proceso de clasificacion.`, caseDesc, imaging)
	} else {
		systemPrompt = `You are an ankle fracture classification assistant. You have access to the following tools:

1. classify_fracture - Classify ankle fractures according to international systems
2. get_options - Get valid options for each parameter
3. validate_combination - Validate if a combination is anatomically possible
4. explain_classification - Explain classification systems

Your goal is to help the clinician:
1. Identify which malleoli are fractured
2. Determine the fibular level (if applicable)
3. Assess fracture morphology
4. Provide Danis-Weber, Lauge-Hansen, AO/OTA, and Bartonicek (if CT available) classifications

Ask specific questions to gather the necessary information. Use the tools to validate and classify.`

		userPrompt = fmt.Sprintf(`Clinical case: %s

Imaging available: %s

Please help me classify this ankle fracture. Start by asking about the affected malleoli and then guide me through the classification process.`, caseDesc, imaging)
	}

	return &mcp.GetPromptResult{
		Description: "Clinical Ankle Fracture Classification",
		Messages: []mcp.PromptMessage{
			{
				Role:    mcp.RoleUser,
				Content: mcp.TextContent{Type: "text", Text: systemPrompt},
			},
			{
				Role:    mcp.RoleUser,
				Content: mcp.TextContent{Type: "text", Text: userPrompt},
			},
		},
	}, nil
}

// ============================================================================
// Educational Guide Prompt
// ============================================================================

func educationalGuidePrompt() mcp.Prompt {
	return mcp.NewPrompt("educational_guide",
		mcp.WithPromptDescription("Educational guide for learning ankle fracture classification systems"),
		mcp.WithArgument("system",
			mcp.ArgumentDescription("Classification system to learn about: danis_weber, lauge_hansen, ao_ota, bartonicek, or all"),
		),
		mcp.WithArgument("level",
			mcp.ArgumentDescription("Learning level: beginner, intermediate, or advanced"),
		),
		mcp.WithArgument("language",
			mcp.ArgumentDescription("Language: en (English) or es (Spanish)"),
		),
	)
}

func educationalGuideHandler(ctx context.Context, request mcp.GetPromptRequest) (*mcp.GetPromptResult, error) {
	args := request.Params.Arguments
	system := args["system"]
	level := args["level"]
	lang := args["language"]

	if system == "" {
		system = "all"
	}
	if level == "" {
		level = "beginner"
	}
	if lang == "" {
		lang = "en"
	}

	var systemPrompt, userPrompt string

	if lang == "es" {
		systemPrompt = `Eres un educador medico especializado en traumatologia de tobillo. Tienes acceso a herramientas para explicar sistemas de clasificacion y proporcionar ejemplos practicos.

Herramientas disponibles:
- explain_classification: Explicaciones detalladas de sistemas
- classify_fracture: Demostrar clasificaciones con ejemplos
- get_options: Mostrar opciones validas

Adapta tu ensenanza al nivel del estudiante:
- Principiante: Conceptos basicos, explicaciones simples
- Intermedio: Detalles clinicos, casos comunes
- Avanzado: Casos complejos, matices, controversias`

		userPrompt = fmt.Sprintf(`Quiero aprender sobre clasificacion de fracturas de tobillo.

Sistema(s) de interes: %s
Mi nivel: %s

Por favor ensenamen este tema de manera estructurada, con ejemplos practicos.`, system, level)
	} else {
		systemPrompt = `You are a medical educator specializing in ankle trauma. You have access to tools to explain classification systems and provide practical examples.

Available tools:
- explain_classification: Detailed explanations of systems
- classify_fracture: Demonstrate classifications with examples
- get_options: Show valid options

Adapt your teaching to the student's level:
- Beginner: Basic concepts, simple explanations
- Intermediate: Clinical details, common cases
- Advanced: Complex cases, nuances, controversies`

		userPrompt = fmt.Sprintf(`I want to learn about ankle fracture classification.

System(s) of interest: %s
My level: %s

Please teach me this topic in a structured way, with practical examples.`, system, level)
	}

	return &mcp.GetPromptResult{
		Description: "Educational Guide for Ankle Fracture Classification",
		Messages: []mcp.PromptMessage{
			{
				Role:    mcp.RoleUser,
				Content: mcp.TextContent{Type: "text", Text: systemPrompt},
			},
			{
				Role:    mcp.RoleUser,
				Content: mcp.TextContent{Type: "text", Text: userPrompt},
			},
		},
	}, nil
}

// ============================================================================
// Research Analysis Prompt
// ============================================================================

func researchAnalysisPrompt() mcp.Prompt {
	return mcp.NewPrompt("research_analysis",
		mcp.WithPromptDescription("Research-focused analysis of ankle fracture patterns and classification correlations"),
		mcp.WithArgument("analysis_type",
			mcp.ArgumentDescription("Type of analysis: distribution, correlation, trends, or comparison"),
		),
		mcp.WithArgument("date_range",
			mcp.ArgumentDescription("Date range for analysis (e.g., 'last_30_days', 'last_year', or 'YYYY-MM-DD to YYYY-MM-DD')"),
		),
	)
}

func researchAnalysisHandler(ctx context.Context, request mcp.GetPromptRequest) (*mcp.GetPromptResult, error) {
	args := request.Params.Arguments
	analysisType := args["analysis_type"]
	dateRange := args["date_range"]

	if analysisType == "" {
		analysisType = "distribution"
	}
	if dateRange == "" {
		dateRange = "last_30_days"
	}

	systemPrompt := `You are a research assistant specializing in orthopedic trauma analysis. You have access to analytics tools to analyze fracture classification data.

Available tools:
- get_analytics_summary: Aggregated classification statistics
- get_analytics_trends: Time-series classification data
- get_classification_distribution: Distribution for specific systems
- classify_fracture: Verify classification logic

Your role is to:
1. Analyze the requested data using available tools
2. Identify patterns and trends
3. Provide statistical insights
4. Suggest areas for further research

Present findings in a clear, research-oriented format with:
- Summary statistics
- Key findings
- Visualizable data (tables, suggested charts)
- Limitations and considerations`

	userPrompt := fmt.Sprintf(`I need research analysis of ankle fracture classifications.

Analysis type: %s
Date range: %s

Please analyze the available data and provide insights on fracture patterns, classification distributions, and any notable trends.`, analysisType, dateRange)

	return &mcp.GetPromptResult{
		Description: "Research Analysis of Ankle Fracture Classifications",
		Messages: []mcp.PromptMessage{
			{
				Role:    mcp.RoleUser,
				Content: mcp.TextContent{Type: "text", Text: systemPrompt},
			},
			{
				Role:    mcp.RoleUser,
				Content: mcp.TextContent{Type: "text", Text: userPrompt},
			},
		},
	}, nil
}
