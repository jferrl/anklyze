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
	"github.com/jferrl/anklyze/internal/repository/postgres"
	"github.com/jferrl/anklyze/internal/service"
	"gorm.io/datatypes"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type studyFixture struct {
	router *gin.Engine
	db     *gorm.DB
	cache  service.StudyStatsCache
	study  *domain.Study
	caseA  uuid.UUID
	caseB  uuid.UUID
}

// newStudyFixture wires sqlite-backed repos and the real study service around a
// study of two cases with one response each and a populated stats cache.
func newStudyFixture(t *testing.T) *studyFixture {
	t.Helper()
	gin.SetMode(gin.TestMode)

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&domain.Study{}, &domain.Case{}, &domain.CaseImage{}, &domain.CaseResponse{}); err != nil {
		t.Fatal(err)
	}

	studyRepo := postgres.NewStudyRepository(db)
	studyRespRepo := postgres.NewStudyResponseRepository(db)
	caseRepo := postgres.NewCaseRepository(db)
	respRepo := postgres.NewCaseResponseRepository(db)
	cache := service.NewTTLStatsCache(time.Hour)
	svc := service.NewStudyService(studyRepo, studyRespRepo, caseRepo, respRepo, nil, nil, cache)

	ctx := context.Background()
	study := domain.NewStudy(uuid.New(), "title", "")
	if err := studyRepo.Create(ctx, study); err != nil {
		t.Fatal(err)
	}
	f := &studyFixture{db: db, cache: cache, study: study}
	var assignments []repository.CaseAssignment
	for i, id := range []*uuid.UUID{&f.caseA, &f.caseB} {
		cs := domain.Case{ID: uuid.New(), CreatedBy: uuid.New(), Title: "case", Status: domain.CaseStatusPublished}
		if err := caseRepo.Create(ctx, &cs); err != nil {
			t.Fatal(err)
		}
		*id = cs.ID
		resp := &domain.CaseResponse{ID: uuid.New(), CaseID: cs.ID, UserID: uuid.New(), Classification: datatypes.JSON(`{}`)}
		if err := respRepo.Save(ctx, resp); err != nil {
			t.Fatal(err)
		}
		assignments = append(assignments, repository.CaseAssignment{CaseID: cs.ID, CaseOrder: i})
	}
	if err := svc.AddCases(ctx, study.ID, assignments); err != nil {
		t.Fatal(err)
	}
	cache.Set(study.ID, &domain.StudyReliabilityMetrics{}) // after AddCases, which drops it

	f.router = gin.New()
	studyHandler := NewStudyHandler(studyRepo, studyRespRepo, caseRepo, nil, svc)
	caseHandler := NewCaseAdminHandler(caseRepo, nil, nil, svc)
	f.router.PUT("/studies/:id", studyHandler.UpdateStudy)
	f.router.DELETE("/studies/:id", studyHandler.DeleteStudy)
	f.router.DELETE("/cases/:id", caseHandler.DeleteCase)
	return f
}

func (f *studyFixture) do(t *testing.T, method, path, body string) {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	f.router.ServeHTTP(w, req)
	if w.Code >= http.StatusMultipleChoices {
		t.Fatalf("%s %s = %d: %s", method, path, w.Code, w.Body.String())
	}
}

func (f *studyFixture) requireCacheDropped(t *testing.T) {
	t.Helper()
	if _, ok := f.cache.Get(f.study.ID); ok {
		t.Error("stats cache still holds the study")
	}
}

func TestDeleteCase_RefreshesStudy(t *testing.T) {
	f := newStudyFixture(t)

	f.do(t, http.MethodDelete, "/cases/"+f.caseA.String(), "")

	f.requireCacheDropped(t)
	var got domain.Study
	if err := f.db.First(&got, "id = ?", f.study.ID).Error; err != nil {
		t.Fatal(err)
	}
	if got.CaseCount != 1 || got.TotalResponses != 1 || got.UniqueRaters != 1 {
		t.Errorf("counters = (cases %d, responses %d, raters %d), want (1, 1, 1)", got.CaseCount, got.TotalResponses, got.UniqueRaters)
	}
}

func TestUpdateStudy_InvalidatesCacheKeepsCounters(t *testing.T) {
	f := newStudyFixture(t)

	f.do(t, http.MethodPut, "/studies/"+f.study.ID.String(), `{"title":"renamed"}`)

	f.requireCacheDropped(t)
	var got domain.Study
	if err := f.db.First(&got, "id = ?", f.study.ID).Error; err != nil {
		t.Fatal(err)
	}
	if got.Title != "renamed" || got.CaseCount != 2 {
		t.Errorf("title=%q case_count=%d, want renamed/2", got.Title, got.CaseCount)
	}
}

func TestDeleteStudy_InvalidatesCache(t *testing.T) {
	f := newStudyFixture(t)

	f.do(t, http.MethodDelete, "/studies/"+f.study.ID.String(), "")

	f.requireCacheDropped(t)
}
