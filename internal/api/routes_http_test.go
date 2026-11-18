package api

import (
	"bytes"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func newLimitRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(CORSMiddleware("http://localhost:5173"), BodyLimitMiddleware())
	r.POST("/json", func(c *gin.Context) {
		var v map[string]any
		if err := c.ShouldBindJSON(&v); err != nil {
			c.Status(http.StatusBadRequest)
			return
		}
		c.Status(http.StatusOK)
	})
	r.POST("/upload", func(c *gin.Context) {
		if _, err := c.FormFile("file"); err != nil {
			c.Status(http.StatusBadRequest)
			return
		}
		c.Status(http.StatusOK)
	})
	return r
}

func TestCORSPreflightAllowsRegisteredMethods(t *testing.T) {
	r := newLimitRouter()
	for _, m := range []string{"GET", "POST", "PUT", "PATCH", "DELETE"} {
		req := httptest.NewRequest(http.MethodOptions, "/json", nil)
		req.Header.Set("Origin", "http://localhost:5173")
		req.Header.Set("Access-Control-Request-Method", m)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Code != http.StatusNoContent {
			t.Errorf("%s: status = %d, want 204", m, w.Code)
		}
		if !strings.Contains(w.Header().Get("Access-Control-Allow-Methods"), m) {
			t.Errorf("%s: Allow-Methods = %q", m, w.Header().Get("Access-Control-Allow-Methods"))
		}
	}
}

func multipartReq(t *testing.T, fileSize int) *http.Request {
	t.Helper()
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	fw, err := mw.CreateFormFile("file", "a.png")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := fw.Write(make([]byte, fileSize)); err != nil {
		t.Fatal(err)
	}
	if err := mw.Close(); err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodPost, "/upload", &buf)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	return req
}

func TestBodyLimitMiddleware(t *testing.T) {
	jsonReq := func(body string) *http.Request {
		req := httptest.NewRequest(http.MethodPost, "/json", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		return req
	}
	bigJSON := `{"a":"` + strings.Repeat("x", MaxJSONBodySize) + `"}`
	chunked := jsonReq(bigJSON)
	chunked.ContentLength = -1

	tests := []struct {
		name string
		req  *http.Request
		want int
	}{
		{"small json", jsonReq(`{"a":1}`), http.StatusOK},
		{"oversized json", jsonReq(bigJSON), http.StatusRequestEntityTooLarge},
		{"oversized json without content-length", chunked, http.StatusRequestEntityTooLarge},
		// Above the JSON cap, below the image cap.
		{"upload within image limit", multipartReq(t, MaxJSONBodySize*4), http.StatusOK},
		{"upload over image limit", multipartReq(t, MaxImageSize), http.StatusRequestEntityTooLarge},
	}

	r := newLimitRouter()
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			r.ServeHTTP(w, tt.req)
			if w.Code != tt.want {
				t.Errorf("status = %d, want %d", w.Code, tt.want)
			}
		})
	}
}
