package i18n

var spanishTranslations = map[string]string{
	// Error messages
	KeyErrorInvalidInput:      "Entrada inválida: ",
	KeyErrorClassification:    "Error en la clasificación: ",
	KeyErrorNoFracturesFound:  "No se detectaron fracturas de maléolos",
	KeyErrorIsolatedPosterior: "Fractura aislada del maléolo posterior",
	KeyErrorChatUnavailable:   "La clasificación por chat no está disponible temporalmente",

	// Form questions
	KeyQuestionMalleoli:              "¿Qué maléolos tiene fracturados?",
	KeyQuestionPosteriorType:         "¿Qué tipo de fractura es?",
	KeyQuestionMedialMorphology:      "¿Qué morfología tiene?",
	KeyQuestionMedialMorphologyLM:    "¿De qué morfología es la fractura del maléolo medial?",
	KeyQuestionFibularLevel:          "¿A qué nivel está la fractura?",
	KeyQuestionFibularLevelLM:        "¿A qué nivel está la fractura de peroné?",
	KeyQuestionFibularLevelTri:       "¿A qué nivel está la fractura del peroné?",
	KeyQuestionLateralMorphology:     "¿De qué morfología es la fractura?",
	KeyQuestionSuprasindesmalType:    "¿De qué tipo?",
	KeyQuestionFibulaInfraTransverse: "¿La fractura del peroné es infrasindesmal y transversa?",
	KeyQuestionHasCTScan:             "¿Tiene TAC?",
	KeyQuestionFibulaTracePattern:    "¿Cómo es el trazo del peroné?",

	// Option labels - Involved malleoli
	KeyOptionPosteriorOnly:    "Maléolo posterior",
	KeyOptionMedialOnly:       "Maléolo medial",
	KeyOptionLateralOnly:      "Maléolo lateral",
	KeyOptionMedialPosterior:  "Maléolos medial y posterior",
	KeyOptionLateralPosterior: "Maléolos lateral y posterior",
	KeyOptionLateralMedial:    "Maléolos lateral y medial",
	KeyOptionTrimaleolar:      "Maléolos medial, lateral y posterior",

	// Option labels - Posterior fracture type (Bartonicek)
	KeyOptionPosteriorExtraincisural:              "Fragmento extraincisural",
	KeyOptionPosteriorPosterolateral:              "Fragmento posterolateral",
	KeyOptionPosteriorPosteromedialPosterolateral: "Fragmento posteromedial y posterolateral",
	KeyOptionPosteriorLargePosterolateral:         "Gran fragmento triangular posterolateral",

	// Option labels - Medial morphology
	KeyOptionMedialOblique:    "Oblicuo",
	KeyOptionMedialTransverse: "Transverso",

	// Option labels - Medial morphology (for lateral+medial path - different label)
	KeyOptionMedialObliqueLM: "Oblicuo/Vertical",

	// Option labels - Fibular level
	KeyOptionFibularInfrasindesmal: "Infrasindesmal",
	KeyOptionFibularTransindesmal:  "Transindesmal",
	KeyOptionFibularSuprasindesmal: "Suprasindesmal",

	// Option labels - Lateral morphology
	KeyOptionLateralTransverse: "Transversa",
	KeyOptionLateralOblique:    "Transversa/Oblicua (Baja medial, alta lateral)/Conminuta",
	KeyOptionLateralSpiral:     "Espiroidea (Baja anterior, alta posterior)",

	// Option labels - Fibula morphology (for lateral+medial and trimaleolar paths)
	KeyOptionFibulaObliqueLMTri: "Oblicua (Baja medial, alta lateral)/Conminuta",

	// Option labels - Suprasindesmal type
	KeyOptionSupraSimple:           "Diafisaria Simple",
	KeyOptionSupraMultifragmentary: "Multifragmentaria",
	KeyOptionSupraProximal:         "Proximal",

	// Option labels - Fibula trace pattern
	KeyOptionFibulaTraceShort: "Parasindesmal de trazo oblicuo corto/transverso/conminuto",
	KeyOptionFibulaTraceLong:  "Parasindesmal o suprasindesmal de trazo oblicuo largo/espiroideo",

	// Labels
	KeyLabelYes:  "Sí",
	KeyLabelNo:   "No",
	KeyLabelHigh: "Alta (Suprasindesmal)",
	KeyLabelLow:  "Baja (Transindesmal / Infrasindesmal)",

	// Fracture descriptions
	KeyNoFractureSelected:                 "No se ha seleccionado ninguna fractura",
	KeyFractureUnimaleolarPosterior:       "Fractura unimaleolar maléolo posterior",
	KeyFractureUnimaleolarMedial:          "Fractura unimaleolar maléolo medial",
	KeyFractureUnimaleolarLateral:         "Fractura unimaleolar maléolo lateral",
	KeyFractureBimaleolarMedialPosterior:  "Fractura bimaleolar (Medial + Posterior)",
	KeyFractureBimaleolarLateralPosterior: "Fractura bimaleolar (Lateral + Posterior)",
	KeyFractureBimaleolarLateralMedial:    "Fractura bimaleolar (Lateral + Medial)",
	KeyFractureTrimaleolar:                "Fractura trimaleolar",

	// Impossible scenarios
	KeyNotPossibleSAMechanism: "No posible. El mecanismo SA no arranca el maléolo posterior. Mecanismo PA son transindesmales o suprasindesmales.",
	KeyNotPossibleExceptional: "No posible (excepcional)",

	// Lauge-Hansen names and descriptions
	KeyLHSAName:        "Supinación-Aducción",
	KeyLHSADesc:        "Mecanismo de supinación con fuerza de aducción.",
	KeyLHSERName:       "Supinación-Rotación Externa",
	KeyLHSERDesc:       "Mecanismo de supinación con rotación externa del astrágalo.",
	KeyLHPERName:       "Pronación-Rotación Externa",
	KeyLHPERDesc:       "Mecanismo de pronación con rotación externa.",
	KeyLHPAName:        "Pronación-Abducción",
	KeyLHPADesc:        "Mecanismo de pronación con abducción.",
	KeyLHAmbiguousName:      "No clasificable",
	KeyLHAmbiguousDesc:      "Lauge-Hansen no clasificable (podría ser PA/SER/PER)",
	KeyLHUnclassifiableDesc: "Las fracturas aisladas del maléolo posterior no encajan en los mecanismos clásicos de Lauge-Hansen",

	// Danis-Weber descriptions
	KeyDWADesc: "Weber A: Fractura por debajo de la sindesmosis",
	KeyDWBDesc: "Weber B: Fractura a nivel de la sindesmosis",
	KeyDWCDesc: "Weber C: Fractura por encima de la sindesmosis",

	// AO/OTA descriptions
	KeyAOA1Desc: "44-A1: Fractura infrasindesmal aislada",
	KeyAOA2Desc: "44-A2: Fractura infrasindesmal con afectación medial",
	KeyAOB1Desc: "44-B1: Fractura transindesmal aislada",
	KeyAOB2Desc: "44-B2: Fractura transindesmal con afectación medial",
	KeyAOB3Desc: "44-B3: Fractura transindesmal con afectación medial y posterior",
	KeyAOC1Desc: "44-C1: Fractura suprasindesmal diafisaria simple",
	KeyAOC2Desc: "44-C2: Fractura suprasindesmal multifragmentaria",
	KeyAOC3Desc: "44-C3: Fractura suprasindesmal proximal (Maisonneuve)",

	// Bartonicek descriptions
	KeyBart1Desc: "Bartonicek 1: Fragmento extraincisural",
	KeyBart2Desc: "Bartonicek 2: Fragmento posterolateral",
	KeyBart3Desc: "Bartonicek 3: Fragmento posteromedial y posterolateral",
	KeyBart4Desc: "Bartonicek 4: Gran fragmento triangular posterolateral",
}
