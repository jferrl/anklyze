package api

import (
	"net/http"
	"testing"

	"github.com/jferrl/anklyze/internal/domain"
)

func TestStudyCaseEditsOnlyWhileDraft(t *testing.T) {
	t.Parallel()
	e := newAPIEnv(t)
	path, cs := e.studyWithCase(t)
	other, _ := e.publishedCase(t, "other")
	call[domain.Study](t, e, e.admin, "PUT", path+"/activate", "", http.StatusOK)

	for name, rt := range map[string]route{
		"add":     {"POST", path + "/cases", `{"case_id":"` + other.ID.String() + `"}`},
		"add-all": {"POST", path + "/cases/add-all", ""},
		"remove":  {"DELETE", path + "/cases/" + cs.ID.String(), ""},
		"reorder": {"PUT", path + "/cases/reorder", `{"case_ids":["` + cs.ID.String() + `"]}`},
	} {
		t.Run(name, func(t *testing.T) {
			assertAPIError(t, e.do(e.admin, rt.method, rt.path, rt.body), http.StatusBadRequest, domain.ErrCodeInvalidStateTransition)
		})
	}

	detail := call[StudyDetailResponse](t, e, e.admin, "GET", path, "", http.StatusOK)
	if len(detail.Cases) != 1 {
		t.Fatalf("active study has %d cases, want its original 1", len(detail.Cases))
	}
}
