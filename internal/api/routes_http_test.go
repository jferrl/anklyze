package api

import (
	"bytes"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/gin-gonic/gin/binding"
	"github.com/jferrl/anklyze/internal/domain"
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
	r.POST(imageUploadRoute, func(c *gin.Context) {
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

func multipartReq(t *testing.T, path string, fileSize int) *http.Request {
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
	req := httptest.NewRequest(http.MethodPost, path, &buf)
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
	upload := "/api/admin/cases/x/images"

	tests := []struct {
		name string
		req  *http.Request
		want int
	}{
		{"small json", jsonReq(`{"a":1}`), http.StatusOK},
		{"oversized json", jsonReq(bigJSON), http.StatusRequestEntityTooLarge},
		{"oversized json without content-length", chunked, http.StatusRequestEntityTooLarge},
		// Above the JSON cap, below the image cap.
		{"upload within image limit", multipartReq(t, upload, MaxJSONBodySize*4), http.StatusOK},
		{"upload over image limit", multipartReq(t, upload, MaxImageSize), http.StatusRequestEntityTooLarge},
		// A multipart Content-Type must not raise the cap on other routes.
		{"multipart to json route", multipartReq(t, "/json", MaxJSONBodySize*4), http.StatusRequestEntityTooLarge},
		{"multipart to unmatched route", multipartReq(t, "/nope", MaxJSONBodySize*4), http.StatusRequestEntityTooLarge},
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

func TestTruncate(t *testing.T) {
	if got := truncate("short", 10); got != "short" {
		t.Errorf("got %q", got)
	}
	// Cutting inside a multi-byte rune must not leave invalid UTF-8 for Postgres.
	if got := truncate("aé", 2); got != "a" {
		t.Errorf("got %q, want %q", got, "a")
	}
}

func TestSubmitResponseRequestBounds(t *testing.T) {
	valid := func() SubmitResponseRequest {
		return SubmitResponseRequest{
			AnswerPath:      []domain.QuestionAnswer{{Question: "involved_malleoli", Answer: "lateral_only"}},
			TimePerQuestion: map[string]int64{"involved_malleoli": 1200},
		}
	}
	if err := binding.Validator.ValidateStruct(valid()); err != nil {
		t.Fatalf("valid tracking rejected: %v", err)
	}

	cases := map[string]func(*SubmitResponseRequest){
		"negative time":      func(r *SubmitResponseRequest) { r.TimeTakenMS = -1 },
		"negative backs":     func(r *SubmitResponseRequest) { r.BackClicks = -1 },
		"long answer":        func(r *SubmitResponseRequest) { r.AnswerPath[0].Answer = strings.Repeat("x", 65) },
		"long decision path": func(r *SubmitResponseRequest) { r.DecisionPath = strings.Repeat("x", 2001) },
		"long map key":       func(r *SubmitResponseRequest) { r.TimePerQuestion[strings.Repeat("k", 65)] = 1 },
		"negative map value": func(r *SubmitResponseRequest) { r.TimePerQuestion["q"] = -1 },
		"too many answers": func(r *SubmitResponseRequest) {
			r.AnswerPath = make([]domain.QuestionAnswer, 201)
		},
	}
	for name, mutate := range cases {
		t.Run(name, func(t *testing.T) {
			r := valid()
			mutate(&r)
			if err := binding.Validator.ValidateStruct(r); err == nil {
				t.Error("accepted, want a validation error")
			}
		})
	}
}
