package i18n

var spanishTranslations = map[string]string{
	// Error messages
	KeyErrorInvalidInput:      "Entrada inválida: ",
	KeyErrorClassification:    "Error en la clasificación: ",
	KeyErrorNoFracturesFound:  "No se detectaron fracturas de maléolos",
	KeyErrorIsolatedPosterior: "Fractura aislada del maléolo posterior",

	// Form questions
	KeyQuestionMalleoli:          "¿Qué maléolos están fracturados?",
	KeyQuestionMalleoliDesc:      "Seleccione todos los maléolos afectados",
	KeyQuestionPosteriorType:     "¿Qué tipo de fractura del maléolo posterior?",
	KeyQuestionPosteriorTypeDesc: "Clasificación de Bartonicek",
	KeyQuestionFibularLevel:      "¿A qué nivel está la fractura del peroné?",
	KeyQuestionFibularLevelDesc:  "Nivel respecto a la sindesmosis",
	KeyQuestionMedialMorphology:  "¿Cuál es la morfología del maléolo medial?",
	KeyQuestionMedialMorphDesc:   "La morfología indica el mecanismo de lesión",
	KeyQuestionFibulaTransverse:  "¿Es la fractura del peroné infrasindesmal y transversa (o una avulsión)?",
	KeyQuestionFibularMorphology: "¿Cuál es la morfología del peroné?",
	KeyQuestionWeberCType:        "¿Qué tipo de fractura suprasindesmal?",
	KeyQuestionInvolvedMalleoli:  "¿Qué maléolos están afectados?",

	// Option labels - Medial morphology
	KeyOptionMedialObliqueVertical: "Oblicua/Vertical",
	KeyOptionMedialTransverse:      "Transversal",
	KeyOptionMedialDoubtful:        "Dudosa",

	// Option labels - Fibular level
	KeyOptionFibularInfrasindesmal:     "Infrasindesmal",
	KeyOptionFibularTransindesmal:      "Transindesmal (a nivel de sindesmosis)",
	KeyOptionFibularSuprasindesmalHigh: "Suprasindesmal Alto (>6cm sobre sindesmosis)",
	KeyOptionFibularDoubtful:           "Dudoso",

	// Option labels - Fibular morphology
	KeyOptionFibularMorphTransverse: "Transversal",
	KeyOptionFibularMorphOblique:    "Oblicua (baja medial / alta lateral)",
	KeyOptionFibularMorphSpiral:     "Espiroidea (baja anterior / alta posterior)",

	// Option labels - Weber C fracture type
	KeyOptionWeberCSimple:        "Diafisaria Simple",
	KeyOptionWeberCMultifragment: "Multifragmentaria",
	KeyOptionWeberCProximal:      "Proximal",

	// Option labels - Involved malleoli (SA)
	KeyOptionInvolvedUnifocal: "Unifocal (solo maléolo lateral)",
	KeyOptionInvolvedBifocal:  "Bifocal (maléolos lateral y medial)",
	KeyOptionInvolvedTrifocal: "Trifocal (maléolos lateral, medial y posterior)",

	// Option labels - Involved malleoli (SER)
	KeyOptionInvolvedLateralOnly:       "Aislado maléolo lateral",
	KeyOptionInvolvedLateralMedial:     "Maléolos lateral y medial",
	KeyOptionInvolvedLateralMedialPost: "Maléolos lateral, medial y posterior",

	// Option labels - Bartonicek
	KeyOptionBartonicek1: "Tipo 1: Fragmento extraincisural",
	KeyOptionBartonicek2: "Tipo 2: Fragmento posterolateral",
	KeyOptionBartonicek3: "Tipo 3: Fragmento posteromedial y posterolateral",
	KeyOptionBartonicek4: "Tipo 4: Gran fragmento triangular posterolateral",

	// Checkbox labels
	KeyLabelMedialMalleolus:    "Maléolo Medial",
	KeyLabelLateralMalleolus:   "Maléolo Lateral (Peroné)",
	KeyLabelPosteriorMalleolus: "Maléolo Posterior",
	KeyLabelYes:                "Sí",
	KeyLabelNo:                 "No",

	// Lauge-Hansen names and descriptions
	KeyLHSAName:              "Supinación-Aducción",
	KeyLHSADesc:              "Mecanismo de supinación con fuerza de aducción. Fractura del maléolo medial vertical/oblicua por 'push-off'.",
	KeyLHSERName:             "Supinación-Rotación Externa",
	KeyLHSERDesc:             "Mecanismo de supinación con rotación externa del astrágalo. Fractura espiroidea del peroné.",
	KeyLHPERName:             "Pronación-Rotación Externa",
	KeyLHPERDesc:             "Mecanismo de pronación con rotación externa. Fractura alta del peroné (>6cm suprasindesmal).",
	KeyLHPAName:              "Pronación-Abducción",
	KeyLHPADesc:              "Mecanismo de pronación con abducción. Fractura transversa/oblicua del peroné.",
	KeyLHAmbiguousName:       "PER o PA (Incierto)",
	KeyLHAmbiguousMedialDesc: "Fractura aislada del maléolo medial. El mecanismo no puede determinarse con certeza: podría ser Pronación-Rotación Externa (PER) o Pronación-Abducción (PA). Se recomienda correlación clínica adicional.",

	// Danis-Weber descriptions
	KeyDWADesc: "Tipo A: Fractura del peroné por debajo del nivel de la sindesmosis. Sindesmosis intacta. Lesión estable.",
	KeyDWBDesc: "Tipo B: Fractura del peroné a nivel de la sindesmosis. Sindesmosis parcialmente lesionada. Estabilidad variable.",
	KeyDWCDesc: "Tipo C: Fractura del peroné por encima de la sindesmosis (>6cm). Sindesmosis rota. Lesión inestable.",

	// AO/OTA descriptions
	KeyAOA1Desc: "44-A1: Fractura infrasindesmal aislada/unifocal del maléolo lateral (peroné)",
	KeyAOA2Desc: "44-A2: Fractura infrasindesmal bifocal del maléolo lateral con afectación medial",
	KeyAOA3Desc: "44-A3: Fractura infrasindesmal trifocal del maléolo lateral con afectación medial y posterior",
	KeyAOB1Desc: "44-B1: Fractura transindesmal aislada del maléolo lateral (peroné)",
	KeyAOB2Desc: "44-B2: Fractura transindesmal del maléolo lateral con afectación medial",
	KeyAOB3Desc: "44-B3: Fractura transindesmal del maléolo lateral con afectación medial y posterior",
	KeyAOC1Desc: "44-C1: Fractura suprasindesmal simple diafisaria del peroné",
	KeyAOC2Desc: "44-C2: Fractura suprasindesmal multifragmentaria del peroné",
	KeyAOC3Desc: "44-C3: Fractura suprasindesmal proximal del peroné (Maisonneuve)",

	// Bartonicek descriptions
	KeyBart1Desc: "Tipo 1: Fragmento extraincisural - pequeño fragmento fuera de la incisura peronea",
	KeyBart2Desc: "Tipo 2: Fragmento posterolateral - afecta la incisura peronea",
	KeyBart3Desc: "Tipo 3: Fragmento posteromedial y posterolateral - extensión medial adicional",
	KeyBart4Desc: "Tipo 4: Gran fragmento triangular posterolateral - compromete gran parte de la superficie articular",

	// Clinical notes
	KeyNoteIsolatedPosterior:       "Fractura aislada del maléolo posterior",
	KeyNoteNoFractures:             "No se detectaron fracturas de maléolos",
	KeyNoteUnimaleolarMedial:       "Fractura unimaleolar del maléolo medial",
	KeyNoteIsolatedMedialDesc:      "Fractura aislada del maléolo medial, típicamente asociada a mecanismo PER/PA",
	KeyNoteBimaleolarMedialPost:    "Fractura bimaleolar del maléolo medial y posterior",
	KeyNoteMedialPostDesc:          "Fractura del maléolo medial con afectación posterior, mecanismo PA",
	KeyNoteIsolatedLateral:         "Fractura aislada del maléolo lateral",
	KeyNoteInfrasindesmal:          "Fractura infrasindesmal (por debajo de la sindesmosis)",
	KeyNoteTransindesmal:           "Fractura transindesmal (a nivel de la sindesmosis)",
	KeyNoteSuprasindesmalHigh:      "Fractura suprasindesmal alta (>6cm por encima de la sindesmosis)",
	KeyNoteSimpleDiaphyseal:        "Fractura diafisaria simple",
	KeyNoteMultifragmentary:        "Fractura multifragmentaria",
	KeyNoteProximalMaisonneuve:     "Fractura proximal (Maisonneuve)",
	KeyNoteLateralWithPosterior:    "Fractura del maléolo lateral con afectación posterior",
	KeyNoteMedialLateralInvolved:   "Fractura con afectación del maléolo medial y lateral",
	KeyNoteObliqueVerticalMedial:   "Morfología oblicua/vertical del maléolo medial (mecanismo push-off)",
	KeyNoteTransverseFibula:        "Fractura transversa del peroné",
	KeyNoteTransverseMedial:        "Morfología transversal del maléolo medial (mecanismo pull-off)",
	KeyNoteDoubtfulMedial:          "Morfología dudosa del maléolo medial",
	KeyNoteSuprasindesmalHighFib:   "Fractura suprasindesmal alta del peroné (>6cm)",
	KeyNoteTransindesmalFib:        "Fractura transindesmal del peroné",
	KeyNoteDoubtfulFibLevel:        "Nivel de fractura del peroné dudoso",
	KeyNoteInfrasindesmalFib:       "Fractura infrasindesmal del peroné",
	KeyNoteTransverseFibMorph:      "Morfología transversal del peroné",
	KeyNoteObliqueFibMorph:         "Morfología oblicua del peroné (baja medial / alta lateral)",
	KeyNoteSpiralFibMorph:          "Morfología espiroidea del peroné (baja anterior / alta posterior)",
	KeyNoteUnifocalLateral:         "Fractura unifocal (solo maléolo lateral)",
	KeyNoteBifocalLateralMedial:    "Fractura bifocal (maléolos lateral y medial)",
	KeyNoteTrifocalAll:             "Fractura trifocal (maléolos lateral, medial y posterior)",
	KeyNoteIsolatedLateralOnly:     "Fractura aislada del maléolo lateral",
	KeyNoteLateralMedialMalleoli:   "Fractura de maléolos lateral y medial",
	KeyNoteLateralMedialPosterior:  "Fractura de maléolos lateral, medial y posterior",
	KeyNoteObliqueInfrasindesmal:   "Fractura oblicua infrasindesmal",
	KeyNoteObliqueTransindesmal:    "Fractura oblicua transindesmal",
	KeyNoteObliqueSuprasindesmal:   "Fractura oblicua suprasindesmal",
	KeyNoteUnifocalIsolatedLateral: "Fractura unifocal/aislada lateral",
	KeyNoteBifocalLatMed:           "Fractura bifocal (lateral y medial)",
	KeyNoteTrifocalLatMedPost:      "Fractura trifocal (lateral, medial y posterior)",
	KeyNoteIsolatedLateralFracture: "Fractura aislada lateral",
}
