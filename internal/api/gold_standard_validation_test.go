package api

import (
	"net/http"
	"testing"

	"github.com/jferrl/anklyze/internal/domain"
)

func TestSetGoldStandardRejectsUnknownValues(t *testing.T) {
	t.Parallel()
	e := newAPIEnv(t)
	cs := e.newCase(t, "c")
	path := "/api/admin/cases/" + cs.ID.String() + "/gold-standard"

	for field, body := range map[string]string{
		"danis_weber":  `{"danis_weber":"Weber D"}`,
		"lauge_hansen": `{"lauge_hansen":"sa"}`,
		"ao_ota":       `{"ao_ota":"44-Z9"}`,
		"bartonicek":   `{"bartonicek":""}`,
	} {
		t.Run(field, func(t *testing.T) {
			w := e.do(e.admin, "PUT", path, body)
			assertAPIError(t, w, http.StatusBadRequest, CodeInvalidInput)
			assertMessageContains(t, w, field)
		})
	}

	got := call[domain.Case](t, e, e.admin, "GET", "/api/admin/cases/"+cs.ID.String(), "", http.StatusOK)
	if len(got.GoldStandard) != 0 {
		t.Errorf("rejected requests stored a gold standard: %s", got.GoldStandard)
	}
}

// Every code the engine can emit, including subgroups and 43-B1/43-B2, must be accepted.
func TestSetGoldStandardAcceptsEveryDomainValue(t *testing.T) {
	t.Parallel()
	e := newAPIEnv(t)
	cs := e.newCase(t, "c")
	path := "/api/admin/cases/" + cs.ID.String() + "/gold-standard"
	put := func(field, value string) {
		call[domain.Case](t, e, e.admin, "PUT", path, `{"`+field+`":"`+value+`"}`, http.StatusOK)
	}

	for _, v := range domain.ValidDanisWeberTypes() {
		put("danis_weber", string(v))
	}
	for _, v := range domain.ValidLaugeHansenTypes() {
		put("lauge_hansen", string(v))
	}
	for _, v := range domain.ValidAOOTACodes() {
		put("ao_ota", string(v))
	}
	for _, v := range domain.ValidBartonicekTypes() {
		put("bartonicek", string(v))
	}
}
