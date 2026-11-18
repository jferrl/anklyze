package api

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/jferrl/anklyze/internal/domain"
)

// A wrapped ErrAlreadyResponded from the repository must answer the same 409 as the pre-check.
func TestHandleError_WrappedAlreadyResponded(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/", nil)

	HandleError(c, fmt.Errorf("save case response: %w", domain.ErrAlreadyResponded), "failed to save response")

	if w.Code != http.StatusConflict {
		t.Errorf("status = %d, want %d", w.Code, http.StatusConflict)
	}
}
