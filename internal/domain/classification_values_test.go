package domain

import (
	"go/ast"
	"go/parser"
	"go/token"
	"slices"
	"strconv"
	"testing"
)

// The Valid* lists must hold exactly the constants declared in classification.go,
// so a new code cannot be added without becoming an accepted gold standard value.
func TestValidClassificationValuesMatchConstants(t *testing.T) {
	t.Parallel()
	file, err := parser.ParseFile(token.NewFileSet(), "classification.go", nil, 0)
	if err != nil {
		t.Fatal(err)
	}

	declared := map[string][]string{}
	ast.Inspect(file, func(n ast.Node) bool {
		vs, ok := n.(*ast.ValueSpec)
		if !ok || vs.Type == nil || len(vs.Values) != 1 {
			return true
		}
		typ, isIdent := vs.Type.(*ast.Ident)
		lit, isLit := vs.Values[0].(*ast.BasicLit)
		if isIdent && isLit && lit.Kind == token.STRING {
			v, _ := strconv.Unquote(lit.Value)
			declared[typ.Name] = append(declared[typ.Name], v)
		}
		return true
	})

	got := map[string][]string{}
	for _, v := range ValidDanisWeberTypes() {
		got["DanisWeberType"] = append(got["DanisWeberType"], string(v))
	}
	for _, v := range ValidLaugeHansenTypes() {
		got["LaugeHansenType"] = append(got["LaugeHansenType"], string(v))
	}
	for _, v := range ValidAOOTACodes() {
		got["AOOTACode"] = append(got["AOOTACode"], string(v))
	}
	for _, v := range ValidBartonicekTypes() {
		got["BartonicekType"] = append(got["BartonicekType"], string(v))
	}

	if len(declared) != 4 {
		t.Fatalf("found constants for %d types, want 4: %v", len(declared), declared)
	}
	for typ, want := range declared {
		have := slices.Clone(got[typ])
		slices.Sort(have)
		slices.Sort(want)
		if !slices.Equal(have, want) {
			t.Errorf("%s: Valid list = %v, declared constants = %v", typ, have, want)
		}
	}
}
