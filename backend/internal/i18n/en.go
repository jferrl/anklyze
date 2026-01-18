package i18n

var englishTranslations = map[string]string{
	// Error messages
	KeyErrorInvalidInput:      "Invalid input: ",
	KeyErrorClassification:    "Classification error: ",
	KeyErrorNoFracturesFound:  "No malleolus fractures detected",
	KeyErrorIsolatedPosterior: "Isolated posterior malleolus fracture",

	// Form questions
	KeyQuestionMalleoli:          "Which malleoli are fractured?",
	KeyQuestionMalleoliDesc:      "Select all affected malleoli",
	KeyQuestionPosteriorType:     "What type of posterior malleolus fracture?",
	KeyQuestionPosteriorTypeDesc: "Bartonicek classification",
	KeyQuestionFibularLevel:      "At what level is the fibular fracture?",
	KeyQuestionFibularLevelDesc:  "Level relative to syndesmosis",
	KeyQuestionMedialMorphology:  "What is the medial malleolus morphology?",
	KeyQuestionMedialMorphDesc:   "Morphology indicates injury mechanism",
	KeyQuestionFibulaTransverse:  "Is the fibular fracture transverse?",
	KeyQuestionFibularMorphology: "What is the fibular morphology?",
	KeyQuestionWeberCType:        "What type of suprasyndesmal fracture?",
	KeyQuestionInvolvedMalleoli:  "Which malleoli are involved?",

	// Option labels - Medial morphology
	KeyOptionMedialObliqueVertical: "Oblique/Vertical",
	KeyOptionMedialTransverse:      "Transverse",
	KeyOptionMedialDoubtful:        "Doubtful",

	// Option labels - Fibular level
	KeyOptionFibularInfrasindesmal:     "Infrasyndesmal",
	KeyOptionFibularTransindesmal:      "Transsyndesmal (at syndesmosis level)",
	KeyOptionFibularSuprasindesmalHigh: "High Suprasyndesmal (>6cm above syndesmosis)",
	KeyOptionFibularDoubtful:           "Doubtful",

	// Option labels - Fibular morphology
	KeyOptionFibularMorphTransverse: "Transverse",
	KeyOptionFibularMorphOblique:    "Oblique (low medial / high lateral)",
	KeyOptionFibularMorphSpiral:     "Spiral (low anterior / high posterior)",

	// Option labels - Weber C fracture type
	KeyOptionWeberCSimple:        "Simple Diaphyseal",
	KeyOptionWeberCMultifragment: "Multifragmentary",
	KeyOptionWeberCProximal:      "Proximal",

	// Option labels - Involved malleoli (SA)
	KeyOptionInvolvedUnifocal: "Unifocal (lateral malleolus only)",
	KeyOptionInvolvedBifocal:  "Bifocal (lateral and medial malleoli)",
	KeyOptionInvolvedTrifocal: "Trifocal (lateral, medial and posterior malleoli)",

	// Option labels - Involved malleoli (SER)
	KeyOptionInvolvedLateralOnly:       "Isolated lateral malleolus",
	KeyOptionInvolvedLateralMedial:     "Lateral and medial malleoli",
	KeyOptionInvolvedLateralMedialPost: "Lateral, medial and posterior malleoli",

	// Option labels - Bartonicek
	KeyOptionBartonicek1: "Type 1: Extraincisural fragment",
	KeyOptionBartonicek2: "Type 2: Posterolateral fragment",
	KeyOptionBartonicek3: "Type 3: Posteromedial and posterolateral fragment",
	KeyOptionBartonicek4: "Type 4: Large posterolateral triangular fragment",

	// Checkbox labels
	KeyLabelMedialMalleolus:    "Medial Malleolus",
	KeyLabelLateralMalleolus:   "Lateral Malleolus (Fibula)",
	KeyLabelPosteriorMalleolus: "Posterior Malleolus",
	KeyLabelYes:                "Yes",
	KeyLabelNo:                 "No",

	// Lauge-Hansen names and descriptions
	KeyLHSAName:  "Supination-Adduction",
	KeyLHSADesc:  "Supination mechanism with adduction force. Vertical/oblique medial malleolus fracture from 'push-off'.",
	KeyLHSERName: "Supination-External Rotation",
	KeyLHSERDesc: "Supination mechanism with external rotation of talus. Spiral fibular fracture.",
	KeyLHPERName: "Pronation-External Rotation",
	KeyLHPERDesc: "Pronation mechanism with external rotation. High fibular fracture (>6cm suprasyndesmal).",
	KeyLHPAName:  "Pronation-Abduction",
	KeyLHPADesc:  "Pronation mechanism with abduction. Transverse/oblique fibular fracture.",

	// Danis-Weber descriptions
	KeyDWADesc: "Type A: Fibular fracture below syndesmosis level. Intact syndesmosis. Stable injury.",
	KeyDWBDesc: "Type B: Fibular fracture at syndesmosis level. Partially injured syndesmosis. Variable stability.",
	KeyDWCDesc: "Type C: Fibular fracture above syndesmosis (>6cm). Ruptured syndesmosis. Unstable injury.",

	// AO/OTA descriptions
	KeyAOA1Desc: "44-A1: Isolated/unifocal infrasyndesmal lateral malleolus (fibular) fracture",
	KeyAOA2Desc: "44-A2: Bifocal infrasyndesmal lateral malleolus fracture with medial involvement",
	KeyAOA3Desc: "44-A3: Trifocal infrasyndesmal lateral malleolus fracture with medial and posterior involvement",
	KeyAOB1Desc: "44-B1: Isolated transsyndesmal lateral malleolus (fibular) fracture",
	KeyAOB2Desc: "44-B2: Transsyndesmal lateral malleolus fracture with medial involvement",
	KeyAOB3Desc: "44-B3: Transsyndesmal lateral malleolus fracture with medial and posterior involvement",
	KeyAOC1Desc: "44-C1: Simple diaphyseal suprasyndesmal fibular fracture",
	KeyAOC2Desc: "44-C2: Multifragmentary suprasyndesmal fibular fracture",
	KeyAOC3Desc: "44-C3: Proximal suprasyndesmal fibular fracture (Maisonneuve)",

	// Bartonicek descriptions
	KeyBart1Desc: "Type 1: Extraincisural fragment - small fragment outside the peroneal notch",
	KeyBart2Desc: "Type 2: Posterolateral fragment - affects the peroneal notch",
	KeyBart3Desc: "Type 3: Posteromedial and posterolateral fragment - additional medial extension",
	KeyBart4Desc: "Type 4: Large posterolateral triangular fragment - compromises much of the articular surface",

	// Clinical notes
	KeyNoteIsolatedPosterior:       "Isolated posterior malleolus fracture",
	KeyNoteNoFractures:             "No malleolus fractures detected",
	KeyNoteUnimaleolarMedial:       "Unimalleolar medial malleolus fracture",
	KeyNoteIsolatedMedialDesc:      "Isolated medial malleolus fracture, typically associated with PER/PA mechanism",
	KeyNoteBimaleolarMedialPost:    "Bimalleolar medial and posterior malleolus fracture",
	KeyNoteMedialPostDesc:          "Medial malleolus fracture with posterior involvement, PA mechanism",
	KeyNoteIsolatedLateral:         "Isolated lateral malleolus fracture",
	KeyNoteInfrasindesmal:          "Infrasyndesmal fracture (below syndesmosis)",
	KeyNoteTransindesmal:           "Transsyndesmal fracture (at syndesmosis level)",
	KeyNoteSuprasindesmalHigh:      "High suprasyndesmal fracture (>6cm above syndesmosis)",
	KeyNoteSimpleDiaphyseal:        "Simple diaphyseal fracture",
	KeyNoteMultifragmentary:        "Multifragmentary fracture",
	KeyNoteProximalMaisonneuve:     "Proximal fracture (Maisonneuve)",
	KeyNoteLateralWithPosterior:    "Lateral malleolus fracture with posterior involvement",
	KeyNoteMedialLateralInvolved:   "Fracture with medial and lateral malleolus involvement",
	KeyNoteObliqueVerticalMedial:   "Oblique/vertical morphology of medial malleolus (push-off mechanism)",
	KeyNoteTransverseFibula:        "Transverse fibular fracture",
	KeyNoteTransverseMedial:        "Transverse morphology of medial malleolus (pull-off mechanism)",
	KeyNoteDoubtfulMedial:          "Doubtful morphology of medial malleolus",
	KeyNoteSuprasindesmalHighFib:   "High suprasyndesmal fibular fracture (>6cm)",
	KeyNoteTransindesmalFib:        "Transsyndesmal fibular fracture",
	KeyNoteDoubtfulFibLevel:        "Doubtful fibular fracture level",
	KeyNoteInfrasindesmalFib:       "Infrasyndesmal fibular fracture",
	KeyNoteTransverseFibMorph:      "Transverse fibular morphology",
	KeyNoteObliqueFibMorph:         "Oblique fibular morphology (low medial / high lateral)",
	KeyNoteSpiralFibMorph:          "Spiral fibular morphology (low anterior / high posterior)",
	KeyNoteUnifocalLateral:         "Unifocal fracture (lateral malleolus only)",
	KeyNoteBifocalLateralMedial:    "Bifocal fracture (lateral and medial malleoli)",
	KeyNoteTrifocalAll:             "Trifocal fracture (lateral, medial and posterior malleoli)",
	KeyNoteIsolatedLateralOnly:     "Isolated lateral malleolus fracture",
	KeyNoteLateralMedialMalleoli:   "Lateral and medial malleoli fracture",
	KeyNoteLateralMedialPosterior:  "Lateral, medial and posterior malleoli fracture",
	KeyNoteObliqueInfrasindesmal:   "Oblique infrasyndesmal fracture",
	KeyNoteObliqueTransindesmal:    "Oblique transsyndesmal fracture",
	KeyNoteObliqueSuprasindesmal:   "Oblique suprasyndesmal fracture",
	KeyNoteUnifocalIsolatedLateral: "Unifocal/isolated lateral fracture",
	KeyNoteBifocalLatMed:           "Bifocal fracture (lateral and medial)",
	KeyNoteTrifocalLatMedPost:      "Trifocal fracture (lateral, medial and posterior)",
	KeyNoteIsolatedLateralFracture: "Isolated lateral fracture",
}
