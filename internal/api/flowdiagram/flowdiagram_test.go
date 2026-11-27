package flowdiagram

import (
	"bytes"
	"testing"

	"github.com/jferrl/anklyze/internal/i18n"
)

func TestSVG(t *testing.T) {
	for _, lang := range []i18n.Language{i18n.English, i18n.Spanish, "fr"} {
		if b := SVG(lang); !bytes.Contains(b[:min(len(b), 512)], []byte("<svg")) {
			t.Errorf("SVG(%q) is not an SVG", lang)
		}
	}
	if bytes.Equal(SVG(i18n.English), SVG(i18n.Spanish)) {
		t.Error("English and Spanish diagrams are identical")
	}
}
