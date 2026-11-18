package api

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/auth"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/repository/postgres"
	"github.com/jferrl/anklyze/internal/service"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

const testSignedURLTTL = 10 * time.Minute

// fakeStorage signs paths deterministically and keeps uploads in memory.
type fakeStorage struct{ uploaded map[string]bool }

func (s *fakeStorage) Upload(_ context.Context, path string, r io.Reader, _ string, _ int64) error {
	if _, err := io.Copy(io.Discard, r); err != nil {
		return err
	}
	s.uploaded[path] = true
	return nil
}

func (s *fakeStorage) Delete(_ context.Context, path string) error {
	delete(s.uploaded, path)
	return nil
}

func (*fakeStorage) GetSignedURL(_ context.Context, path string, _ time.Duration) (string, error) {
	return "https://storage.test/" + path + "?sig=ok", nil
}

// apiEnv runs the real handlers over in-memory sqlite repositories and the
// real services. Each test gets its own database, so tests are parallel-safe.
type apiEnv struct {
	db      *gorm.DB
	router  *gin.Engine
	cases   *postgres.CaseRepository
	storage *fakeStorage
	admin   uuid.UUID
	rater   uuid.UUID
}

func newAPIEnv(t *testing.T) *apiEnv {
	t.Helper()
	gin.SetMode(gin.TestMode)

	// A named shared-cache database keeps every pooled connection on the same data.
	dsn := "file:" + uuid.NewString() + "?mode=memory&cache=shared"
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&domain.User{}, &domain.Study{}, &domain.Case{}, &domain.CaseImage{}, &domain.CaseResponse{}); err != nil {
		t.Fatal(err)
	}

	caseRepo := postgres.NewCaseRepository(db)
	respRepo := postgres.NewCaseResponseRepository(db)
	studyRepo := postgres.NewStudyRepository(db)
	studyRespRepo := postgres.NewStudyResponseRepository(db)
	userRepo := postgres.NewUserRepository(db)
	stats := service.NewStatisticsService()
	studySvc := service.NewStudyService(studyRepo, studyRespRepo, caseRepo, respRepo, stats, stats, service.NewTTLStatsCache(time.Hour))
	store := &fakeStorage{uploaded: map[string]bool{}}

	env := &apiEnv{db: db, cases: caseRepo, storage: store, admin: uuid.New(), rater: uuid.New()}
	env.addUser(t, env.admin, "admin@example.test", domain.UserRoleAdmin)
	env.addUser(t, env.rater, "rater@example.test", domain.UserRoleUser)

	// The caller is named by the X-Test-User header, standing in for auth.
	r := gin.New()
	r.Use(func(c *gin.Context) {
		id, err := uuid.Parse(c.GetHeader("X-Test-User"))
		if err != nil {
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}
		c.Set(auth.ContextKeyUserID, id.String())
		var u domain.User
		if db.First(&u, "id = ?", id).Error == nil {
			c.Set(auth.ContextKeyUser, &u)
		}
		c.Next()
	})
	admin := NewCaseAdminHandler(caseRepo, store, stats, studySvc)
	image := NewCaseImageHandler(caseRepo, store, testSignedURLTTL)
	access := NewCaseAccessHandler(caseRepo, respRepo)
	responses := NewCaseResponseHandler(caseRepo, respRepo, studySvc, newTestClassificationSvc(), store, testSignedURLTTL)
	analytics := NewCaseAnalyticsHandler(caseRepo, respRepo, postgres.NewCaseAnalyticsRepository(db), stats)
	registerUserCaseRoutes(r.Group("/api/cases"), access, responses)
	registerProfileRoutes(r.Group("/api/me"), NewUserHandler(userRepo))
	registerAdminCaseRoutes(r.Group("/api/admin/cases"), admin, image, responses, analytics)
	registerAdminStudyRoutes(r.Group("/api/admin/studies"), NewStudyHandler(studyRepo, studyRespRepo, caseRepo, userRepo, studySvc))
	env.router = r
	return env
}

func (e *apiEnv) addUser(t *testing.T, id uuid.UUID, email string, role domain.UserRole) {
	t.Helper()
	if err := e.db.Create(&domain.User{ID: id, Email: email, Role: role}).Error; err != nil {
		t.Fatal(err)
	}
}

// do sends a JSON request as the given user.
func (e *apiEnv) do(as uuid.UUID, method, path, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-User", as.String())
	w := httptest.NewRecorder()
	e.router.ServeHTTP(w, req)
	return w
}

// call sends a request, requires the status and decodes the JSON body into T.
func call[T any](t *testing.T, e *apiEnv, as uuid.UUID, method, path, body string, status int) T {
	t.Helper()
	w := e.do(as, method, path, body)
	if w.Code != status {
		t.Fatalf("%s %s = %d, want %d: %s", method, path, w.Code, status, w.Body)
	}
	var v T
	if w.Body.Len() > 0 {
		if err := json.Unmarshal(w.Body.Bytes(), &v); err != nil {
			t.Fatalf("%s %s: body is not the expected JSON: %v: %s", method, path, err, w.Body)
		}
	}
	return v
}

// newCase creates a case through the API and returns it.
func (e *apiEnv) newCase(t *testing.T, title string) domain.Case {
	t.Helper()
	return call[domain.Case](t, e, e.admin, "POST", "/api/admin/cases", `{"title":"`+title+`","description":"d"}`, http.StatusCreated)
}

// addImage attaches an image row directly: upload is covered by TestUploadImage.
func (e *apiEnv) addImage(t *testing.T, caseID uuid.UUID, category domain.ImageCategory, order int) *domain.CaseImage {
	t.Helper()
	img := domain.NewCaseImage(caseID, category, order, "x.png", "image/png", 1, "cases/"+caseID.String()+"/"+uuid.NewString()+".png")
	if err := e.cases.AddImage(context.Background(), img); err != nil {
		t.Fatal(err)
	}
	return img
}

// publishedCase creates a case with one image and publishes it through the API.
func (e *apiEnv) publishedCase(t *testing.T, title string) (domain.Case, *domain.CaseImage) {
	t.Helper()
	cs := e.newCase(t, title)
	img := e.addImage(t, cs.ID, domain.ImageCategoryXRay, 0)
	cs = call[domain.Case](t, e, e.admin, "PUT", "/api/admin/cases/"+cs.ID.String()+"/publish", "", http.StatusOK)
	return cs, img
}

// parseCSV requires a 200 download of the given content type and returns its rows.
func parseCSV(t *testing.T, w *httptest.ResponseRecorder, contentType string) [][]string {
	t.Helper()
	if w.Code != http.StatusOK || w.Header().Get("Content-Type") != contentType {
		t.Fatalf("status = %d, content-type = %q: %s", w.Code, w.Header().Get("Content-Type"), w.Body)
	}
	if !strings.HasPrefix(w.Header().Get("Content-Disposition"), "attachment; filename=") {
		t.Errorf("Content-Disposition = %q", w.Header().Get("Content-Disposition"))
	}
	rows, err := csv.NewReader(w.Body).ReadAll()
	if err != nil {
		t.Fatalf("not valid CSV: %v: %s", err, w.Body)
	}
	if len(rows) == 0 {
		t.Fatal("empty CSV")
	}
	return rows
}
