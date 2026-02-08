package normalization

import "strings"

// columnAliases maps CSV header variants to internal field names.
var columnAliases = map[string]string{
	"nhc":                          "patient_code",
	"numero historia":              "patient_code",
	"id paciente":                  "patient_code",
	"edad":                         "age",
	"age":                          "age",
	"sexo":                         "sex",
	"sex":                          "sex",
	"genero":                       "sex",
	"talla":                        "height_cm",
	"altura":                       "height_cm",
	"height":                       "height_cm",
	"peso":                         "weight_kg",
	"weight":                       "weight_kg",
	"imc":                          "bmi",
	"bmi":                          "bmi",
	"vitamina d":                   "vitamin_d",
	"vit d":                        "vitamin_d",
	"25-oh-d":                      "vitamin_d",
	"fecha de fractura":            "fracture_date",
	"fecha fractura":               "fracture_date",
	"fx date":                      "fracture_date",
	"fecha urgencias":              "er_date",
	"fecha de urgencias":           "er_date",
	"fecha cirugia":                "surgery_date",
	"fecha de cirugia":             "surgery_date",
	"lateralidad":                  "laterality",
	"side":                         "laterality",
	"mecanismo lesional":           "injury_mechanism",
	"mecanismo":                    "injury_mechanism",
	"mechanism":                    "injury_mechanism",
	"energia":                      "trauma_energy",
	"energy":                       "trauma_energy",
	"abierta/cerrada":              "open_closed",
	"abierta cerrada":              "open_closed",
	"open closed":                  "open_closed",
	"lesiones asociadas":           "associated_injuries",
	"associated injuries":          "associated_injuries",
	"tratamiento urgencia":         "emergency_treatment",
	"tratamiento de urgencia":      "emergency_treatment",
	"emergency treatment":          "emergency_treatment",
	"complicaciones prequirurgicas": "presurgical_complications",
	"tipo de cirugia":              "surgery_type",
	"cirugia":                      "surgery_type",
	"surgery type":                 "surgery_type",
	"motivo cirugia":               "surgery_reason",
	"abordaje":                     "approaches",
	"abordajes":                    "approaches",
	"approaches":                   "approaches",
	"sindesmosis":                  "syndesmosis",
	"reparacion sindesmosis":       "syndesmosis",
	"tc prequirurgico":             "preop_ct",
	"tc preoperatorio":             "preop_ct",
	"anticoagulacion":              "anticoagulation",
	"aco":                          "anticoagulation",
	"desplazamiento secundario":    "secondary_displacement",
	"tratamiento desplazamiento":   "displacement_treatment",
	"complicaciones postquirurgicas": "postop_complications",
	"notas operatorias":            "operative_notes",
}

// sexMap maps sex variants to normalized values.
var sexMap = map[string]string{
	"mujer":     "female",
	"hombre":    "male",
	"m":         "female",
	"h":         "male",
	"f":         "female",
	"woman":     "female",
	"man":       "male",
	"femenino":  "female",
	"masculino": "male",
	"female":    "female",
	"male":      "male",
}

// lateralityMap maps laterality variants to normalized values.
var lateralityMap = map[string]string{
	"izquierda": "left",
	"derecha":   "right",
	"bilateral": "bilateral",
	"izq":       "left",
	"dcha":      "right",
	"der":       "right",
	"left":      "left",
	"right":     "right",
}

// mechanismMap maps injury mechanism variants to normalized values.
var mechanismMap = map[string]string{
	"torsion sin caida":                     "torsion_no_fall",
	"torsion y caida":                       "torsion_and_fall",
	"caida desde su altura":                 "fall_standing_height",
	"caida desde su propia altura":          "fall_standing_height",
	"caida desde escalera/<1m":              "fall_below_1m",
	"caida desde &lt;1m":                    "fall_below_1m",
	"caida desde >1m":                       "fall_above_1m",
	"caida desde mas de 1m":                 "fall_above_1m",
	"accidente de trafico":                  "traffic_accident",
	"accidente deportivo":                   "sports_injury",
	"agresion":                              "assault",
	"atropello":                             "pedestrian_hit",
	"caida desde patinete, bicicleta...":    "vehicle_fall",
	"caida desde patinete, bicicleta\x85":   "vehicle_fall",
	"caida desde patinete, bicicleta":       "vehicle_fall",
}

// energyMap maps trauma energy variants to normalized values.
var energyMap = map[string]string{
	"alta": "high",
	"baja": "low",
	"high": "high",
	"low":  "low",
}

// emergencyTreatmentMap maps emergency treatment variants to normalized values.
var emergencyTreatmentMap = map[string]string{
	"reduccion cerrada+inmovilizacion":    "closed_reduction_immobilization",
	"reduccion cerrada+fijador externo":   "closed_reduction_external_fixator",
	"rafi":                                "orif_emergency",
	"tratamiento conservador":             "conservative",
	"inmovilizacion":                      "immobilization",
	"fijador externo":                     "external_fixator",
}

// openClosedMap maps open/closed fracture variants to normalized values.
var openClosedMap = map[string]string{
	"cerrada":     "closed",
	"abierta":     "open",
	"gustilo i":   "open_gustilo_1",
	"gustilo ii":  "open_gustilo_2",
	"gustilo iii": "open_gustilo_3",
	"closed":      "closed",
	"open":        "open",
}

// boolMap maps boolean variants to normalized values.
var boolMap = map[string]string{
	"si":        "true",
	"sí":        "true",
	"no":        "false",
	"yes":       "true",
	"s":         "true",
	"n":         "false",
	"adiro 100": "true",
}

// approachMap maps surgical approach variants to normalized values.
var approachMap = map[string]string{
	"lateral":                "lateral",
	"medial":                 "medial",
	"posterolateral":         "posterolateral",
	"posteromedial":          "posteromedial",
	"anterolateral":          "anterolateral",
	"anteromedial":           "anteromedial",
	"percutaneo medial":      "percutaneous_medial",
	"percutáneo medial":      "percutaneous_medial",
	"percutaneo":             "percutaneous",
	"clavo":                  "intramedullary_nail",
	"minopen anterolateral":  "mini_open_anterolateral",
	"posterior":              "posterior",
}

// spanishMonths maps Spanish month names to month numbers.
var spanishMonths = map[string]int{
	"enero":      1,
	"febrero":    2,
	"marzo":      3,
	"abril":      4,
	"mayo":       5,
	"junio":      6,
	"julio":      7,
	"agosto":     8,
	"septiembre": 9,
	"octubre":    10,
	"noviembre":  11,
	"diciembre":  12,
}

// knownBrands maps brand variants to normalized brand names.
var knownBrands = map[string]string{
	"paragon":           "Paragon",
	"paragon28":         "Paragon",
	"paragon gorilla":   "Paragon Gorilla",
	"gorilla":           "Paragon Gorilla",
	"gorilla (paragon)": "Paragon Gorilla",
	"arthrex":           "Arthrex",
	"newclip":           "NewClip",
	"synthes":           "Synthes",
	"zimmer":            "Zimmer",
	"minimonster":       "Paragon MiniMonster",
	"mini monster":      "Paragon MiniMonster",
	"mini-monster":      "Paragon MiniMonster",
	"tight rope":        "Arthrex TightRope",
	"tightrope":         "Arthrex TightRope",
	"tight-rope":        "Arthrex TightRope",
	"juggerknot":        "Zimmer JuggerKnot",
	"jugerknot":         "Zimmer JuggerKnot",
	"zip tigh":          "Zimmer ZipTight",
	"ziptight":          "Zimmer ZipTight",
	"phoenix":           "Phoenix",
}

// normalizeBrand normalizes brand names using exact match, contains match, and fuzzy matching.
func normalizeBrand(raw string) string {
	if raw == "" {
		return ""
	}

	lower := strings.ToLower(raw)

	// 1. Exact match
	if normalized, ok := knownBrands[lower]; ok {
		return normalized
	}

	// 2. Contains match - check if input contains any known brand key
	for key, normalized := range knownBrands {
		if strings.Contains(lower, key) {
			return normalized
		}
	}

	// 3. Fuzzy match - find closest match within Levenshtein distance of 2
	minDistance := 3 // Only accept distance <= 2
	var bestMatch string
	for key, normalized := range knownBrands {
		dist := levenshteinDistance(lower, key)
		if dist < minDistance {
			minDistance = dist
			bestMatch = normalized
		}
	}

	if bestMatch != "" {
		return bestMatch
	}

	// 4. No match - return original
	return raw
}

// levenshteinDistance calculates the Levenshtein distance between two strings.
func levenshteinDistance(a, b string) int {
	if len(a) == 0 {
		return len(b)
	}
	if len(b) == 0 {
		return len(a)
	}

	// Single-row optimization
	prev := make([]int, len(b)+1)
	for j := range prev {
		prev[j] = j
	}

	for i := 1; i <= len(a); i++ {
		curr := make([]int, len(b)+1)
		curr[0] = i

		for j := 1; j <= len(b); j++ {
			cost := 1
			if a[i-1] == b[j-1] {
				cost = 0
			}

			curr[j] = min(
				curr[j-1]+1,    // insertion
				prev[j]+1,      // deletion
				prev[j-1]+cost, // substitution
			)
		}

		prev = curr
	}

	return prev[len(b)]
}

func min(a, b, c int) int {
	if a < b {
		if a < c {
			return a
		}
		return c
	}
	if b < c {
		return b
	}
	return c
}

// clinicalRange defines valid ranges for clinical measurements.
type clinicalRange struct {
	Min  float64
	Max  float64
	Unit string
}

// clinicalRanges maps field names to their valid clinical ranges.
var clinicalRanges = map[string]clinicalRange{
	"age":       {Min: 18, Max: 105, Unit: "years"},
	"height_cm": {Min: 130, Max: 210, Unit: "cm"},
	"weight_kg": {Min: 30, Max: 250, Unit: "kg"},
	"bmi":       {Min: 15, Max: 60, Unit: "kg/m²"},
	"vitamin_d": {Min: 3, Max: 150, Unit: "ng/mL"},
}
