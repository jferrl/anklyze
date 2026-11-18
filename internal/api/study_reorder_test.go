package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestReorderCasesRejectsUnknownAndDuplicateIDs(t *testing.T) {
	t.Parallel()
	e := newAPIEnv(t)
	path, cs := e.studyWithCase(t)
	elsewhere, _ := e.publishedCase(t, "elsewhere") // exists, but in no study
	id := cs.ID.String()

	for name, tt := range map[string]struct {
		body string
		want string // substring of the message
	}{
		"unknown":   {`{"case_ids":["` + id + `","` + elsewhere.ID.String() + `"]}`, elsewhere.ID.String()},
		"duplicate": {`{"case_ids":["` + id + `","` + id + `"]}`, id},
	} {
		t.Run(name, func(t *testing.T) {
			w := e.do(e.admin, "PUT", path+"/cases/reorder", tt.body)
			assertAPIError(t, w, http.StatusBadRequest, CodeInvalidInput)
			assertMessageContains(t, w, tt.want)
		})
	}

	call[struct{}](t, e, e.admin, "PUT", path+"/cases/reorder", `{"case_ids":["`+id+`"]}`, http.StatusNoContent)
}

func assertMessageContains(t *testing.T, w *httptest.ResponseRecorder, want string) {
	t.Helper()
	if !strings.Contains(w.Body.String(), want) {
		t.Errorf("body %s does not mention %q", w.Body, want)
	}
}
