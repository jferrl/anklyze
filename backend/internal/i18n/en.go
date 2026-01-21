package i18n

var englishTranslations = map[string]string{
	// Error messages
	KeyErrorInvalidInput:      "Invalid input: ",
	KeyErrorClassification:    "Classification error: ",
	KeyErrorNoFracturesFound:  "No malleolus fractures detected",
	KeyErrorIsolatedPosterior: "Isolated posterior malleolus fracture",
	KeyErrorChatUnavailable:   "Chat classification is temporarily unavailable",

	// Form questions
	KeyQuestionMalleoli:              "Which malleoli are fractured?",
	KeyQuestionPosteriorType:         "What type of fracture is it?",
	KeyQuestionMedialMorphology:      "What morphology does it have?",
	KeyQuestionMedialMorphologyLM:    "What is the morphology of the medial malleolus fracture?",
	KeyQuestionFibularLevel:          "At what level is the fracture?",
	KeyQuestionFibularLevelLM:        "At what level is the fibular fracture?",
	KeyQuestionFibularLevelTri:       "What is the morphology of the fibular fracture?",
	KeyQuestionLateralMorphology:     "What is the morphology of the fracture?",
	KeyQuestionSuprasindesmalType:    "What type?",
	KeyQuestionFibulaInfraTransverse: "Is the fibular fracture infrasyndesmal and transverse?",

	// Option labels - Involved malleoli
	KeyOptionPosteriorOnly:    "Posterior malleolus",
	KeyOptionMedialOnly:       "Medial malleolus",
	KeyOptionLateralOnly:      "Lateral malleolus",
	KeyOptionMedialPosterior:  "Medial and posterior malleoli",
	KeyOptionLateralPosterior: "Lateral and posterior malleoli",
	KeyOptionLateralMedial:    "Lateral and medial malleoli",
	KeyOptionTrimaleolar:      "Medial, lateral and posterior malleoli",

	// Option labels - Posterior fracture type (Bartonicek)
	KeyOptionPosteriorExtraincisural:              "Extraincisural fragment",
	KeyOptionPosteriorPosterolateral:              "Posterolateral fragment",
	KeyOptionPosteriorPosteromedialPosterolateral: "Posteromedial and posterolateral fragment",
	KeyOptionPosteriorLargePosterolateral:         "Large posterolateral triangular fragment",

	// Option labels - Medial morphology
	KeyOptionMedialOblique:    "Oblique",
	KeyOptionMedialTransverse: "Transverse",

	// Option labels - Fibular level
	KeyOptionFibularInfrasindesmal: "Infrasyndesmal",
	KeyOptionFibularTransindesmal:  "Transsyndesmal",
	KeyOptionFibularSuprasindesmal: "Suprasyndesmal",

	// Option labels - Lateral morphology
	KeyOptionLateralTransverse: "Transverse",
	KeyOptionLateralOblique:    "Oblique (Low medial, high lateral)",
	KeyOptionLateralSpiral:     "Spiral (Low anterior, high posterior)",

	// Option labels - Suprasindesmal type
	KeyOptionSupraSimple:         "Simple Diaphyseal",
	KeyOptionSupraMultifragmentary: "Multifragmentary",
	KeyOptionSupraProximal:       "Proximal",

	// Labels
	KeyLabelYes:  "Yes",
	KeyLabelNo:   "No",
	KeyLabelHigh: "High",
	KeyLabelLow:  "Low",

	// Fracture descriptions
	KeyNoFractureSelected:                 "No fracture selected",
	KeyFractureUnimaleolarPosterior:       "Unimalleolar posterior malleolus fracture",
	KeyFractureUnimaleolarMedial:          "Unimalleolar medial malleolus fracture",
	KeyFractureUnimaleolarLateral:         "Unimalleolar lateral malleolus fracture",
	KeyFractureBimaleolarMedialPosterior:  "Bimalleolar fracture (Medial + Posterior)",
	KeyFractureBimaleolarLateralPosterior: "Bimalleolar fracture (Lateral + Posterior)",
	KeyFractureBimaleolarLateralMedial:    "Bimalleolar fracture (Lateral + Medial)",
	KeyFractureTrimaleolar:                "Trimalleolar fracture",

	// Impossible scenarios
	KeyNotPossibleSAMechanism: "Not possible. SA mechanism does not involve the posterior malleolus. PA mechanism is transsyndesmotic or suprasyndesmotic.",
	KeyNotPossibleExceptional: "Not possible (exceptional)",

	// Lauge-Hansen names and descriptions
	KeyLHSAName:        "Supination-Adduction",
	KeyLHSADesc:        "Supination mechanism with adduction force.",
	KeyLHSERName:       "Supination-External Rotation",
	KeyLHSERDesc:       "Supination mechanism with external rotation of talus.",
	KeyLHPERName:       "Pronation-External Rotation",
	KeyLHPERDesc:       "Pronation mechanism with external rotation.",
	KeyLHPAName:        "Pronation-Abduction",
	KeyLHPADesc:        "Pronation mechanism with abduction.",
	KeyLHAmbiguousName: "Not classifiable",
	KeyLHAmbiguousDesc: "Lauge-Hansen not classifiable (could be PA/SER/PER)",

	// Danis-Weber descriptions
	KeyDWADesc: "Weber A: Fracture below syndesmosis",
	KeyDWBDesc: "Weber B: Fracture at syndesmosis level",
	KeyDWCDesc: "Weber C: Fracture above syndesmosis",

	// AO/OTA descriptions
	KeyAOA1Desc: "44-A1: Isolated infrasyndesmal fracture",
	KeyAOA2Desc: "44-A2: Infrasyndesmal fracture with medial involvement",
	KeyAOB1Desc: "44-B1: Isolated transsyndesmal fracture",
	KeyAOB2Desc: "44-B2: Transsyndesmal fracture with medial involvement",
	KeyAOB3Desc: "44-B3: Transsyndesmal fracture with medial and posterior involvement",
	KeyAOC1Desc: "44-C1: Simple diaphyseal suprasyndesmal fracture",
	KeyAOC2Desc: "44-C2: Multifragmentary suprasyndesmal fracture",
	KeyAOC3Desc: "44-C3: Proximal suprasyndesmal fracture (Maisonneuve)",

	// Bartonicek descriptions
	KeyBart1Desc: "Bartonicek 1: Extraincisural fragment",
	KeyBart2Desc: "Bartonicek 2: Posterolateral fragment",
	KeyBart3Desc: "Bartonicek 3: Posteromedial and posterolateral fragment",
	KeyBart4Desc: "Bartonicek 4: Large posterolateral triangular fragment",
}
