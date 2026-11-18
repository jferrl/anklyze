package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/repository"
)

// updateRepo stubs the two CaseRepository methods UpdateCase uses.
type updateRepo struct {
	repository.CaseRepository
	cs      *domain.Case
	updated bool
}

func (r *updateRepo) GetByID(context.Context, uuid.UUID) (*domain.Case, error) { return r.cs, nil }
func (r *updateRepo) Update(context.Context, *domain.Case) error               { r.updated = true; return nil }

func TestCaseAdminHandler_UpdateCase(t *testing.T) {
	t.Parallel()
	gin.SetMode(gin.TestMode)

	deadline := time.Date(2030, 1, 2, 0, 0, 0, 0, time.UTC)
	replaced := time.Date(2031, 5, 6, 0, 0, 0, 0, time.UTC)

	tests := []struct {
		name         string
		status       domain.CaseStatus
		body         string
		wantStatus   int
		wantTitle    string
		wantDesc     string
		wantDeadline *time.Time
	}{
		{"absent deadline leaves it unchanged", domain.CaseStatusDraft, `{"description":"new"}`, 200, "old", "new", &deadline},
		{"null deadline clears it", domain.CaseStatusDraft, `{"deadline":null}`, 200, "old", "old desc", nil},
		{"null deadline clears it on published", domain.CaseStatusPublished, `{"deadline":null}`, 200, "old", "old desc", nil},
		{"deadline can be replaced", domain.CaseStatusPublished, `{"deadline":"2031-05-06T00:00:00Z"}`, 200, "old", "old desc", &replaced},
		{"empty description clears it", domain.CaseStatusPublished, `{"description":""}`, 200, "old", "", &deadline},
		{"draft title edit", domain.CaseStatusDraft, `{"title":"new"}`, 200, "new", "old desc", &deadline},
		{"published title edit rejected", domain.CaseStatusPublished, `{"title":"new","description":"new"}`, 400, "old", "old desc", &deadline},
		{"closed description rejected", domain.CaseStatusClosed, `{"description":"new"}`, 400, "old", "old desc", &deadline},
		{"closed deadline clear rejected", domain.CaseStatusClosed, `{"deadline":null}`, 400, "old", "old desc", &deadline},
		{"invalid deadline", domain.CaseStatusDraft, `{"deadline":"nope"}`, 400, "old", "old desc", &deadline},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			d := deadline
			cs := domain.NewCase(uuid.New(), "old", "old desc", &d)
			cs.Status = tt.status
			repo := &updateRepo{cs: cs}
			h := NewCaseAdminHandler(repo, nil, nil, nil)
			r := gin.New()
			r.PUT("/cases/:id", h.UpdateCase)

			req := httptest.NewRequest(http.MethodPut, "/cases/"+cs.ID.String(), strings.NewReader(tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d: %s", w.Code, tt.wantStatus, w.Body)
			}
			if repo.updated != (tt.wantStatus == http.StatusOK) {
				t.Errorf("repo updated = %v, want %v", repo.updated, tt.wantStatus == http.StatusOK)
			}
			if cs.Title != tt.wantTitle || cs.Description != tt.wantDesc {
				t.Errorf("title/desc = %q/%q, want %q/%q", cs.Title, cs.Description, tt.wantTitle, tt.wantDesc)
			}
			switch {
			case tt.wantDeadline == nil && cs.Deadline != nil:
				t.Errorf("deadline = %v, want nil", cs.Deadline)
			case tt.wantDeadline != nil && (cs.Deadline == nil || !cs.Deadline.Equal(*tt.wantDeadline)):
				t.Errorf("deadline = %v, want %v", cs.Deadline, tt.wantDeadline)
			}
		})
	}
}
