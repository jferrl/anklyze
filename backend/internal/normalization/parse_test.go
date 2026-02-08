package normalization

import (
	"reflect"
	"testing"
)

func TestDetectEncoding(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		data []byte
		want string
	}{
		{
			name: "valid UTF-8",
			data: []byte("hello world"),
			want: "utf-8",
		},
		{
			name: "UTF-8 with BOM",
			data: []byte{0xEF, 0xBB, 0xBF, 'h', 'i'},
			want: "utf-8",
		},
		{
			name: "Latin-1 with accents",
			data: []byte{0x43, 0x6C, 0x61, 0x73, 0x69, 0x66, 0x69, 0x63, 0x61, 0x63, 0x69, 0xF3, 0x6E},
			want: "latin-1",
		},
		{
			name: "CP1252 ellipsis",
			data: []byte{0x68, 0x6F, 0x6C, 0x61, 0x85},
			want: "cp1252",
		},
		{
			name: "CP1252 smart quotes",
			data: []byte{0x68, 0x93, 0x77, 0x94},
			want: "cp1252",
		},
		{
			name: "CP1252 right quote",
			data: []byte{0x68, 0x65, 0x6C, 0x6C, 0x6F, 0x92},
			want: "cp1252",
		},
		{
			name: "empty",
			data: []byte{},
			want: "utf-8",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := detectEncoding(tt.data)
			if got != tt.want {
				t.Errorf("detectEncoding() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestDecodeToUTF8(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		data    []byte
		enc     string
		want    string
		wantErr bool
	}{
		{
			name: "UTF-8 passthrough",
			data: []byte("hello world"),
			enc:  "utf-8",
			want: "hello world",
		},
		{
			name: "UTF-8 BOM stripping",
			data: []byte{0xEF, 0xBB, 0xBF, 'h', 'i'},
			enc:  "utf-8",
			want: "hi",
		},
		{
			name: "Latin-1 conversion",
			data: []byte{0x43, 0x6C, 0x61, 0x73, 0x69, 0x66, 0x69, 0x63, 0x61, 0x63, 0x69, 0xF3, 0x6E},
			enc:  "latin-1",
			want: "Clasificación",
		},
		{
			name: "CP1252 ellipsis replacement",
			data: []byte{0x68, 0x6F, 0x6C, 0x61, 0x85},
			enc:  "cp1252",
			want: "hola...",
		},
		{
			name: "CP1252 smart quotes replacement",
			data: []byte{0x68, 0x93, 0x77, 0x6F, 0x72, 0x64, 0x94},
			enc:  "cp1252",
			want: `h"word"`,
		},
		{
			name: "CP1252 right quote replacement",
			data: []byte{0x49, 0x74, 0x92, 0x73},
			enc:  "cp1252",
			want: "It's",
		},
		{
			name: "trailing null bytes",
			data: []byte{'h', 'i', 0x00, 0x00},
			enc:  "utf-8",
			want: "hi",
		},
		{
			name:    "unsupported encoding",
			data:    []byte("test"),
			enc:     "unknown",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got, err := decodeToUTF8(tt.data, tt.enc)
			if (err != nil) != tt.wantErr {
				t.Errorf("decodeToUTF8() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && got != tt.want {
				t.Errorf("decodeToUTF8() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestDetectDelimiter(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		text string
		want rune
	}{
		{
			name: "comma",
			text: "a,b,c\n1,2,3",
			want: ',',
		},
		{
			name: "semicolon",
			text: "a;b;c\n1;2;3",
			want: ';',
		},
		{
			name: "tab",
			text: "a\tb\tc\n1\t2\t3",
			want: '\t',
		},
		{
			name: "default when empty",
			text: "",
			want: ',',
		},
		{
			name: "mixed with comma winning",
			text: "a,b;c,d\n",
			want: ',',
		},
		{
			name: "single line no newline",
			text: "a,b,c",
			want: ',',
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := detectDelimiter(tt.text)
			if got != tt.want {
				t.Errorf("detectDelimiter() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestMapColumns(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name           string
		headers        []string
		wantMapping    map[int]string
		wantUnmapped   []string
	}{
		{
			name:    "standard Spanish headers",
			headers: []string{"Edad", "Sexo", "Talla"},
			wantMapping: map[int]string{
				0: "age",
				1: "sex",
				2: "height_cm",
			},
			wantUnmapped: nil,
		},
		{
			name:    "headers with spaces",
			headers: []string{"  Edad  ", " Sexo", "Talla "},
			wantMapping: map[int]string{
				0: "age",
				1: "sex",
				2: "height_cm",
			},
			wantUnmapped: nil,
		},
		{
			name:    "mixed case",
			headers: []string{"EDAD", "SeXo", "LATERALIDAD"},
			wantMapping: map[int]string{
				0: "age",
				1: "sex",
				2: "laterality",
			},
			wantUnmapped: nil,
		},
		{
			name:    "with unknown column",
			headers: []string{"Edad", "Unknown Column", "Sexo"},
			wantMapping: map[int]string{
				0: "age",
				2: "sex",
			},
			wantUnmapped: []string{"Unknown Column"},
		},
		{
			name:    "compound header names",
			headers: []string{"Fecha de fractura", "Numero historia", "Vitamina D"},
			wantMapping: map[int]string{
				0: "fracture_date",
				1: "patient_code",
				2: "vitamin_d",
			},
			wantUnmapped: nil,
		},
		{
			name:         "empty headers",
			headers:      []string{"", "  ", "Edad"},
			wantMapping:  map[int]string{2: "age"},
			wantUnmapped: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			gotMapping, gotUnmapped := mapColumns(tt.headers)
			if !reflect.DeepEqual(gotMapping, tt.wantMapping) {
				t.Errorf("mapColumns() mapping = %v, want %v", gotMapping, tt.wantMapping)
			}
			if !reflect.DeepEqual(gotUnmapped, tt.wantUnmapped) {
				t.Errorf("mapColumns() unmapped = %v, want %v", gotUnmapped, tt.wantUnmapped)
			}
		})
	}
}

func TestDropEmptyColumns(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		records   [][]string
		wantCount int
		wantCols  int // expected number of columns after dropping
	}{
		{
			name: "middle column empty",
			records: [][]string{
				{"A", "", "C"},
				{"1", "", "3"},
				{"2", "", "4"},
			},
			wantCount: 1,
			wantCols:  2,
		},
		{
			name: "no empty columns",
			records: [][]string{
				{"A", "B", "C"},
				{"1", "2", "3"},
			},
			wantCount: 0,
			wantCols:  3,
		},
		{
			name: "all columns empty",
			records: [][]string{
				{"", "", ""},
				{"", "", ""},
			},
			wantCount: 3,
			wantCols:  0,
		},
		{
			name: "multiple empty columns",
			records: [][]string{
				{"A", "", "C", ""},
				{"1", "", "3", ""},
			},
			wantCount: 2,
			wantCols:  2,
		},
		{
			name: "empty with whitespace",
			records: [][]string{
				{"A", "  ", "C"},
				{"1", " ", "3"},
			},
			wantCount: 1,
			wantCols:  2,
		},
		{
			name:      "empty input",
			records:   [][]string{},
			wantCount: 0,
			wantCols:  0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got, count := dropEmptyColumns(tt.records)
			if count != tt.wantCount {
				t.Errorf("dropEmptyColumns() count = %d, want %d", count, tt.wantCount)
			}
			if len(got) > 0 && len(got[0]) != tt.wantCols {
				t.Errorf("dropEmptyColumns() columns = %d, want %d", len(got[0]), tt.wantCols)
			}
		})
	}
}

func TestDropEmptyRows(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		records   []map[string]string
		wantCount int
		wantRows  int
	}{
		{
			name: "one empty row",
			records: []map[string]string{
				{"age": "30", "sex": "male"},
				{"age": "", "sex": ""},
				{"age": "25", "sex": "female"},
			},
			wantCount: 1,
			wantRows:  2,
		},
		{
			name: "no empty rows",
			records: []map[string]string{
				{"age": "30", "sex": "male"},
				{"age": "25", "sex": "female"},
			},
			wantCount: 0,
			wantRows:  2,
		},
		{
			name: "all empty rows",
			records: []map[string]string{
				{"age": "", "sex": ""},
				{"age": "", "sex": ""},
			},
			wantCount: 2,
			wantRows:  0,
		},
		{
			name: "empty with whitespace",
			records: []map[string]string{
				{"age": "  ", "sex": " "},
				{"age": "30", "sex": "male"},
			},
			wantCount: 1,
			wantRows:  1,
		},
		{
			name: "partial empty is not dropped",
			records: []map[string]string{
				{"age": "30", "sex": ""},
				{"age": "", "sex": "female"},
			},
			wantCount: 0,
			wantRows:  2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got, count := dropEmptyRows(tt.records)
			if count != tt.wantCount {
				t.Errorf("dropEmptyRows() count = %d, want %d", count, tt.wantCount)
			}
			if len(got) != tt.wantRows {
				t.Errorf("dropEmptyRows() rows = %d, want %d", len(got), tt.wantRows)
			}
		})
	}
}

func TestParsePhase(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		csvData []byte
		wantErr bool
		checks  func(*testing.T, *parseResult)
	}{
		{
			name:    "valid UTF-8 CSV with known headers",
			csvData: []byte("Edad,Sexo,Talla\n30,Hombre,175\n25,Mujer,160"),
			wantErr: false,
			checks: func(t *testing.T, pr *parseResult) {
				if len(pr.records) != 2 {
					t.Errorf("expected 2 records, got %d", len(pr.records))
				}
				if pr.records[0]["age"] != "30" {
					t.Errorf("expected age=30, got %s", pr.records[0]["age"])
				}
				if pr.records[0]["sex"] != "Hombre" {
					t.Errorf("expected sex=Hombre, got %s", pr.records[0]["sex"])
				}
			},
		},
		{
			name:    "CSV with semicolons",
			csvData: []byte("Edad;Sexo;Talla\n30;Hombre;175\n25;Mujer;160"),
			wantErr: false,
			checks: func(t *testing.T, pr *parseResult) {
				if len(pr.records) != 2 {
					t.Errorf("expected 2 records, got %d", len(pr.records))
				}
				// Check that delimiter was detected
				delimiterDetected := false
				for _, entry := range pr.log {
					if entry.Action == "delimiter_detected" && entry.NormalizedValue == ";" {
						delimiterDetected = true
					}
				}
				if !delimiterDetected {
					t.Error("expected semicolon delimiter to be detected")
				}
			},
		},
		{
			name:    "empty CSV",
			csvData: []byte(""),
			wantErr: true,
		},
		{
			name:    "header only",
			csvData: []byte("Edad,Sexo,Talla"),
			wantErr: true,
		},
		{
			name:    "with empty columns",
			csvData: []byte("Edad,,Sexo\n30,,male\n25,,female"),
			wantErr: false,
			checks: func(t *testing.T, pr *parseResult) {
				if pr.emptyColsRemoved != 1 {
					t.Errorf("expected 1 empty column removed, got %d", pr.emptyColsRemoved)
				}
			},
		},
		{
			name:    "with empty rows",
			csvData: []byte("Edad,Sexo\n30,male\n,\n25,female"),
			wantErr: false,
			checks: func(t *testing.T, pr *parseResult) {
				if pr.emptyRowsRemoved != 1 {
					t.Errorf("expected 1 empty row removed, got %d", pr.emptyRowsRemoved)
				}
				if len(pr.records) != 2 {
					t.Errorf("expected 2 records after empty row removal, got %d", len(pr.records))
				}
			},
		},
		{
			name:    "Latin-1 encoding",
			csvData: []byte{0x45, 0x64, 0x61, 0x64, 0x2C, 0x53, 0x65, 0x78, 0x6F, 0x0A, 0x33, 0x30, 0x2C, 0x48, 0x6F, 0x6D, 0x62, 0x72, 0x65},
			wantErr: false,
			checks: func(t *testing.T, pr *parseResult) {
				if len(pr.records) != 1 {
					t.Errorf("expected 1 record, got %d", len(pr.records))
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got, err := parsePhase(tt.csvData)
			if (err != nil) != tt.wantErr {
				t.Errorf("parsePhase() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && tt.checks != nil {
				tt.checks(t, got)
			}
		})
	}
}
