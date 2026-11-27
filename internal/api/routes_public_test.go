package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/jferrl/anklyze/internal/auth"
)

// TestProtectedRoutes_PublicClassify checks that anonymous callers can classify
// but cannot fetch the admin-only flow diagram.
func TestProtectedRoutes_PublicClassify(t *testing.T) {
	jwks := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"keys":[]}`))
	}))
	defer jwks.Close()
	validator, err := auth.NewValidator(context.Background(), jwks.URL)
	if err != nil {
		t.Fatal(err)
	}

	gin.SetMode(gin.TestMode)
	router := gin.New()
	setupProtectedRoutes(router.Group("/api"), validator, nil, setupTestHandler())

	tests := []struct {
		method, path, body string
		want               int
	}{
		{http.MethodPost, "/api/classify", `{"involved_malleoli":"lateral_only"}`, http.StatusOK},
		{http.MethodGet, "/api/admin/flow-diagram", "", http.StatusUnauthorized},
	}
	for _, tt := range tests {
		w := httptest.NewRecorder()
		router.ServeHTTP(w, httptest.NewRequest(tt.method, tt.path, strings.NewReader(tt.body)))
		if w.Code != tt.want {
			t.Errorf("%s %s = %d, want %d", tt.method, tt.path, w.Code, tt.want)
		}
	}
}

func TestFlowDiagram(t *testing.T) {
	router := gin.New()
	router.GET("/d", setupTestHandler().FlowDiagram)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/d", nil))
	if w.Code != http.StatusOK || w.Header().Get("Content-Type") != "image/svg+xml" {
		t.Errorf("got %d %q", w.Code, w.Header().Get("Content-Type"))
	}
}
