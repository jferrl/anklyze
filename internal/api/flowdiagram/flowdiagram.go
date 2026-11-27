// Package flowdiagram embeds the classifier's flow diagram SVGs, built by
// scripts/build_flow_diagram.py. They are served to admins only, so the
// decision tree stays out of the public frontend bundle.
package flowdiagram

import (
	"embed"

	"github.com/jferrl/anklyze/internal/i18n"
)

//go:embed classification-flow.*.svg
var files embed.FS

// SVG returns the diagram for lang; Spanish is the source and the fallback.
func SVG(lang i18n.Language) []byte {
	if lang != i18n.English {
		lang = i18n.Spanish
	}
	b, err := files.ReadFile("classification-flow." + string(lang) + ".svg")
	if err != nil {
		panic(err) // both files are embedded at build time
	}
	return b
}
