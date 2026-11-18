package api

import (
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/jferrl/anklyze/internal/domain"
)

func TestUploadImageEnforcesMaxImagesPerCase(t *testing.T) {
	t.Parallel()
	e := newAPIEnv(t)
	cs := e.newCase(t, "c")
	upload := func() *httptest.ResponseRecorder {
		req := uploadRequest(t, cs.ID, "xray", "a.png", "image/png", pngBytes)
		req.URL.Path = "/api/admin/cases/" + cs.ID.String() + "/images"
		req.Header.Set("X-Test-User", e.admin.String())
		w := httptest.NewRecorder()
		e.router.ServeHTTP(w, req)
		return w
	}

	for i := 0; i < MaxImagesPerCase-1; i++ {
		e.addImage(t, cs.ID, domain.ImageCategoryXRay, i)
	}
	if w := upload(); w.Code != http.StatusCreated {
		t.Fatalf("upload below the limit = %d: %s", w.Code, w.Body)
	}

	w := upload()
	assertAPIError(t, w, http.StatusBadRequest, CodeInvalidInput)
	assertMessageContains(t, w, strconv.Itoa(MaxImagesPerCase))
	if len(e.storage.uploaded) != 1 {
		t.Errorf("%d files in storage, want only the one accepted upload", len(e.storage.uploaded))
	}
}
