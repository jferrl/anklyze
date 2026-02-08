package normalization

import (
	"testing"
)

func TestParseSpanishDate(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name    string
		input   string
		want    string // ISO format "2006-01-02"
		wantErr bool
	}{
		{"full format mayo", "30 mayo 2025", "2025-05-30", false},
		{"short year junio", "10 junio 25", "2025-06-10", false},
		{"leading zero junio", "01 junio 2025", "2025-06-01", false},
		{"no leading zero octubre", "1 octubre 25", "2025-10-01", false},
		{"slash format", "01/06/2025", "2025-06-01", false},
		{"slash short year", "01/06/25", "2025-06-01", false},
		{"ISO format passthrough", "2025-06-01", "2025-06-01", false},
		{"dash format", "01-06-2025", "2025-06-01", false},
		{"enero", "15 enero 25", "2025-01-15", false},
		{"febrero", "28 febrero 25", "2025-02-28", false},
		{"marzo", "1 marzo 25", "2025-03-01", false},
		{"abril", "10 abril 25", "2025-04-10", false},
		{"mayo single digit", "5 mayo 2025", "2025-05-05", false},
		{"julio", "4 julio 25", "2025-07-04", false},
		{"agosto", "15 agosto 25", "2025-08-15", false},
		{"septiembre", "20 septiembre 25", "2025-09-20", false},
		{"noviembre", "11 noviembre 25", "2025-11-11", false},
		{"diciembre", "25 diciembre 25", "2025-12-25", false},
		{"4 digit year", "12 marzo 2024", "2024-03-12", false},
		{"dash short year", "15-03-24", "2024-03-15", false},
		{"invalid month", "10 invalid 25", "", true},
		{"empty", "", "", true},
		{"garbage", "not a date", "", true},
		{"only numbers", "12345", "", true},
		{"partial", "10 mayo", "", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got, err := parseSpanishDate(tt.input)
			if tt.wantErr {
				if err == nil {
					t.Error("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got.Format("2006-01-02") != tt.want {
				t.Errorf("parseSpanishDate(%q) = %q, want %q", tt.input, got.Format("2006-01-02"), tt.want)
			}
		})
	}
}

func TestNormalizeSex(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{"mujer lowercase", "mujer", "female"},
		{"Mujer capital", "Mujer", "female"},
		{"MUJER uppercase", "MUJER", "female"},
		{"mujer with spaces", " mujer ", "female"},
		{"hombre lowercase", "hombre", "male"},
		{"Hombre capital", "Hombre", "male"},
		{"m shorthand", "m", "female"},
		{"h shorthand", "h", "male"},
		{"M uppercase shorthand", "M", "female"},
		{"H uppercase shorthand", "H", "male"},
		{"f english", "f", "female"},
		{"female english", "female", "female"},
		{"male english", "male", "male"},
		{"femenino spanish", "femenino", "female"},
		{"masculino spanish", "masculino", "male"},
		{"woman english", "woman", "female"},
		{"man english", "man", "male"},
		{"unknown", "unknown", ""},
		{"empty", "", ""},
		{"invalid", "xyz", ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := normalizeSex(tt.input)
			if got != tt.want {
				t.Errorf("normalizeSex(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestNormalizeLaterality(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{"izquierda lowercase", "izquierda", "left"},
		{"Izquierda capital", "Izquierda", "left"},
		{"izq shorthand", "izq", "left"},
		{"derecha lowercase", "derecha", "right"},
		{"Derecha capital", " Derecha ", "right"},
		{"dcha shorthand", "dcha", "right"},
		{"der shorthand", "der", "right"},
		{"bilateral", "bilateral", "bilateral"},
		{"Bilateral capital", "Bilateral", "bilateral"},
		{"left english", "left", "left"},
		{"right english", "right", "right"},
		{"unknown", "unknown", ""},
		{"empty", "", ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := normalizeLaterality(tt.input)
			if got != tt.want {
				t.Errorf("normalizeLaterality(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestNormalizeMechanism(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{"torsion sin caida", "torsion sin caida", "torsion_no_fall"},
		{"Torsion sin caida capital", "Torsion sin caida", "torsion_no_fall"},
		{"torsion y caida", "torsion y caida", "torsion_and_fall"},
		{"caida desde su altura", "caida desde su altura", "fall_standing_height"},
		{"caida desde su propia altura", "caida desde su propia altura", "fall_standing_height"},
		{"caida desde escalera/<1m", "caida desde escalera/<1m", "fall_below_1m"},
		{"caida desde &lt;1m", "caida desde &lt;1m", "fall_below_1m"},
		{"caida desde >1m", "caida desde >1m", "fall_above_1m"},
		{"caida desde mas de 1m", "caida desde mas de 1m", "fall_above_1m"},
		{"accidente de trafico", "accidente de trafico", "traffic_accident"},
		{"accidente deportivo", "accidente deportivo", "sports_injury"},
		{"agresion", "agresion", "assault"},
		{"atropello", "atropello", "pedestrian_hit"},
		{"caida desde patinete, bicicleta...", "caida desde patinete, bicicleta...", "vehicle_fall"},
		{"caida desde patinete, bicicleta", "caida desde patinete, bicicleta", "vehicle_fall"},
		{"unknown", "unknown", ""},
		{"empty", "", ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := normalizeMechanism(tt.input)
			if got != tt.want {
				t.Errorf("normalizeMechanism(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestNormalizeEnergy(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{"alta lowercase", "alta", "high"},
		{"Alta capital", "Alta", "high"},
		{"ALTA uppercase", "ALTA", "high"},
		{"baja lowercase", "baja", "low"},
		{"Baja capital", "Baja", "low"},
		{"high english", "high", "high"},
		{"HIGH uppercase", "HIGH", "high"},
		{"low english", "low", "low"},
		{"unknown", "unknown", ""},
		{"empty", "", ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := normalizeEnergy(tt.input)
			if got != tt.want {
				t.Errorf("normalizeEnergy(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestNormalizeBoolean(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name      string
		input     string
		wantValue bool
		wantOk    bool
	}{
		{"si lowercase", "si", true, true},
		{"sí with accent", "sí", true, true},
		{"Si capital", "Si", true, true},
		{"SI uppercase", "SI", true, true},
		{"no lowercase", "no", false, true},
		{"No capital", "No", false, true},
		{"NO uppercase", "NO", false, true},
		{"yes english", "yes", true, true},
		{"YES uppercase", "YES", true, true},
		{"s shorthand", "s", true, true},
		{"n shorthand", "n", false, true},
		{"adiro 100", "adiro 100", true, true},
		{"Adiro 100 capital", "Adiro 100", true, true},
		{"ADIRO 100 uppercase", "ADIRO 100", true, true},
		{"unknown", "unknown", false, false},
		{"empty", "", false, false},
		{"invalid", "maybe", false, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			gotValue, gotOk := normalizeBoolean(tt.input)
			if gotValue != tt.wantValue || gotOk != tt.wantOk {
				t.Errorf("normalizeBoolean(%q) = (%v, %v), want (%v, %v)",
					tt.input, gotValue, gotOk, tt.wantValue, tt.wantOk)
			}
		})
	}
}

func TestNormalizeEmergencyTreatment(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{"reduccion cerrada+inmovilizacion", "reduccion cerrada+inmovilizacion", "closed_reduction_immobilization"},
		{"Reduccion cerrada+inmovilizacion capital", "Reduccion cerrada+inmovilizacion", "closed_reduction_immobilization"},
		{"reduccion cerrada+fijador externo", "reduccion cerrada+fijador externo", "closed_reduction_external_fixator"},
		{"rafi", "rafi", "orif_emergency"},
		{"RAFI uppercase", "RAFI", "orif_emergency"},
		{"tratamiento conservador", "tratamiento conservador", "conservative"},
		{"inmovilizacion", "inmovilizacion", "immobilization"},
		{"fijador externo", "fijador externo", "external_fixator"},
		{"unknown", "unknown", ""},
		{"empty", "", ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := normalizeEmergencyTreatment(tt.input)
			if got != tt.want {
				t.Errorf("normalizeEmergencyTreatment(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestNormalizeOpenClosed(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{"cerrada lowercase", "cerrada", "closed"},
		{"Cerrada capital", "Cerrada", "closed"},
		{"abierta lowercase", "abierta", "open"},
		{"Abierta capital", "Abierta", "open"},
		{"gustilo i lowercase", "gustilo i", "open_gustilo_1"},
		{"Gustilo I capital", "Gustilo I", "open_gustilo_1"},
		{"gustilo ii", "gustilo ii", "open_gustilo_2"},
		{"Gustilo II capital", "Gustilo II", "open_gustilo_2"},
		{"gustilo iii", "gustilo iii", "open_gustilo_3"},
		{"Gustilo III capital", "Gustilo III", "open_gustilo_3"},
		{"closed english", "closed", "closed"},
		{"open english", "open", "open"},
		{"unknown", "unknown", ""},
		{"empty", "", ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := normalizeOpenClosed(tt.input)
			if got != tt.want {
				t.Errorf("normalizeOpenClosed(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestNormalizePhase(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name              string
		input             []map[string]string
		wantDatesNorm     int
		wantEnumsMapped   int
		wantLogCount      int
		checkRecord       int // which record to verify
		checkField        string
		wantValue         string
	}{
		{
			name: "normalize dates",
			input: []map[string]string{
				{
					"fracture_date": "30 mayo 2025",
					"er_date":       "01/06/2025",
					"surgery_date":  "2025-06-15",
				},
			},
			wantDatesNorm:   3,
			wantEnumsMapped: 0,
			checkRecord:     0,
			checkField:      "fracture_date",
			wantValue:       "2025-05-30",
		},
		{
			name: "normalize sex and laterality",
			input: []map[string]string{
				{
					"sex":         "Mujer",
					"laterality":  "Izquierda",
				},
			},
			wantDatesNorm:   0,
			wantEnumsMapped: 2,
			checkRecord:     0,
			checkField:      "sex",
			wantValue:       "female",
		},
		{
			name: "normalize booleans",
			input: []map[string]string{
				{
					"syndesmosis":            "Si",
					"preop_ct":               "No",
					"anticoagulation":        "Adiro 100",
					"secondary_displacement": "n",
				},
			},
			wantDatesNorm:   0,
			wantEnumsMapped: 4,
			checkRecord:     0,
			checkField:      "syndesmosis",
			wantValue:       "true",
		},
		{
			name: "normalize mechanism and energy",
			input: []map[string]string{
				{
					"injury_mechanism": "caida desde su altura",
					"trauma_energy":    "Baja",
				},
			},
			wantDatesNorm:   0,
			wantEnumsMapped: 2,
			checkRecord:     0,
			checkField:      "injury_mechanism",
			wantValue:       "fall_standing_height",
		},
		{
			name: "normalize emergency treatment and open/closed",
			input: []map[string]string{
				{
					"emergency_treatment": "reduccion cerrada+inmovilizacion",
					"open_closed":         "Gustilo II",
				},
			},
			wantDatesNorm:   0,
			wantEnumsMapped: 2,
			checkRecord:     0,
			checkField:      "open_closed",
			wantValue:       "open_gustilo_2",
		},
		{
			name: "multiple records",
			input: []map[string]string{
				{
					"fracture_date": "15 enero 25",
					"sex":           "H",
					"syndesmosis":   "si",
				},
				{
					"surgery_date": "10/03/25",
					"laterality":   "derecha",
					"preop_ct":     "no",
				},
			},
			wantDatesNorm:   2,
			wantEnumsMapped: 4,
			checkRecord:     1,
			checkField:      "laterality",
			wantValue:       "right",
		},
		{
			name: "invalid date logs warning",
			input: []map[string]string{
				{
					"fracture_date": "not a date",
					"sex":           "mujer",
				},
			},
			wantDatesNorm:   0,
			wantEnumsMapped: 1,
			checkRecord:     0,
			checkField:      "sex",
			wantValue:       "female",
		},
		{
			name: "unknown enum keeps original",
			input: []map[string]string{
				{
					"sex": "other",
				},
			},
			wantDatesNorm:   0,
			wantEnumsMapped: 0,
			checkRecord:     0,
			checkField:      "sex",
			wantValue:       "other",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			result := normalizePhase(tt.input)

			if result.datesNormalized != tt.wantDatesNorm {
				t.Errorf("datesNormalized = %d, want %d", result.datesNormalized, tt.wantDatesNorm)
			}
			if result.enumsMapped != tt.wantEnumsMapped {
				t.Errorf("enumsMapped = %d, want %d", result.enumsMapped, tt.wantEnumsMapped)
			}
			if len(result.records) != len(tt.input) {
				t.Errorf("records count = %d, want %d", len(result.records), len(tt.input))
			}
			if tt.checkRecord < len(result.records) && tt.checkField != "" {
				got := result.records[tt.checkRecord][tt.checkField]
				if got != tt.wantValue {
					t.Errorf("record[%d][%q] = %q, want %q", tt.checkRecord, tt.checkField, got, tt.wantValue)
				}
			}
			if len(result.log) == 0 && (tt.wantDatesNorm > 0 || tt.wantEnumsMapped > 0) {
				t.Error("expected log entries but got none")
			}
		})
	}
}
