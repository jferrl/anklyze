package api

import (
	"net/http"
	"testing"

	"github.com/jferrl/anklyze/internal/domain"
)

// studyWithCase returns a draft study holding one published case.
func (e *apiEnv) studyWithCase(t *testing.T) (path string, cs domain.Case) {
	t.Helper()
	cs, _ = e.publishedCase(t, "c")
	st := e.newStudy(t, "s")
	path = "/api/admin/studies/" + st.ID.String()
	call[domain.Case](t, e, e.admin, "POST", path+"/cases", `{"case_id":"`+cs.ID.String()+`"}`, http.StatusCreated)
	return path, cs
}

func TestCloseStudyOnlyFromActive(t *testing.T) {
	t.Parallel()
	e := newAPIEnv(t)
	path, _ := e.studyWithCase(t)

	assertAPIError(t, e.do(e.admin, "PUT", path+"/close", ""), http.StatusBadRequest, domain.ErrCodeInvalidStateTransition)
	if got := call[domain.Study](t, e, e.admin, "GET", path, "", http.StatusOK); got.Status != domain.StudyStatusDraft {
		t.Fatalf("draft study changed to %q by a rejected close", got.Status)
	}

	call[domain.Study](t, e, e.admin, "PUT", path+"/activate", "", http.StatusOK)
	call[domain.Study](t, e, e.admin, "PUT", path+"/close", "", http.StatusOK)
	assertAPIError(t, e.do(e.admin, "PUT", path+"/close", ""), http.StatusBadRequest, domain.ErrCodeInvalidStateTransition)
}
