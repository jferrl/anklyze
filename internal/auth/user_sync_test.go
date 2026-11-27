package auth

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
)

type roleSyncSvc struct {
	role   atomic.Value // domain.UserRole
	pushed chan domain.UserRole
}

func newRoleSyncSvc() *roleSyncSvc {
	s := &roleSyncSvc{pushed: make(chan domain.UserRole, 1000)}
	s.role.Store(domain.UserRole("user"))
	return s
}

func (s *roleSyncSvc) GetByID(_ context.Context, id uuid.UUID) (*domain.User, error) {
	return &domain.User{ID: id, Role: s.role.Load().(domain.UserRole)}, nil
}

func (s *roleSyncSvc) SyncOnLogin(context.Context, uuid.UUID, string, string) (*domain.User, error) {
	return nil, nil
}

func (s *roleSyncSvc) SyncRoleToSupabase(_ context.Context, _ uuid.UUID, role domain.UserRole) {
	s.pushed <- role
}

// settle waits for the first push (if one is expected), lets stragglers land,
// and returns every push beyond the first.
func (s *roleSyncSvc) settle(t *testing.T, wantFirst bool) []domain.UserRole {
	t.Helper()
	if wantFirst {
		select {
		case <-s.pushed:
		case <-time.After(2 * time.Second):
			t.Fatal("expected a role sync, got none")
		}
	}
	time.Sleep(50 * time.Millisecond)
	var extra []domain.UserRole
	for len(s.pushed) > 0 {
		extra = append(extra, <-s.pushed)
	}
	return extra
}

func syncRouter(svc UserService, id uuid.UUID, tokenRole string) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set(ContextKeyClaims, &Claims{RegisteredClaims: jwt.RegisteredClaims{Subject: id.String()}, Role: tokenRole})
	})
	r.Use(UserSyncMiddleware(svc))
	r.GET("/x", func(c *gin.Context) { c.String(200, string(GetUserRole(c))) })
	return r
}

func get(r *gin.Engine) string {
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest("GET", "/x", nil))
	return w.Body.String()
}

func TestUserSync_StaleTokenSyncsOnce(t *testing.T) {
	svc := newRoleSyncSvc()
	r := syncRouter(svc, uuid.New(), "authenticated")
	for range 50 {
		if got := get(r); got != "user" {
			t.Fatalf("role = %q, want user", got)
		}
	}
	if extra := svc.settle(t, true); len(extra) != 0 {
		t.Errorf("syncs beyond the first: %v", extra)
	}
}

func TestUserSync_MatchingRoleNeverSyncs(t *testing.T) {
	svc := newRoleSyncSvc()
	r := syncRouter(svc, uuid.New(), "user")
	for range 5 {
		get(r)
	}
	if extra := svc.settle(t, false); len(extra) != 0 {
		t.Errorf("synced although token role matches: %v", extra)
	}
}

func TestUserSync_RoleChangeSyncsAgain(t *testing.T) {
	svc := newRoleSyncSvc()
	r := syncRouter(svc, uuid.New(), "authenticated")
	get(r)
	get(r)
	if extra := svc.settle(t, true); len(extra) != 0 {
		t.Fatalf("extra syncs before role change: %v", extra)
	}

	// Simulates make db-make-admin: the DB changes, the token does not.
	svc.role.Store(domain.UserRole("admin"))
	if got := get(r); got != "admin" {
		t.Fatalf("role after change = %q, want admin (DB is read per request)", got)
	}
	get(r)
	select {
	case got := <-svc.pushed:
		if got != "admin" {
			t.Errorf("pushed %q, want admin", got)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("role change did not trigger a sync")
	}
	if extra := svc.settle(t, false); len(extra) != 0 {
		t.Errorf("extra syncs after role change: %v", extra)
	}
}

func TestUserSync_ConcurrentRequestsSyncOnce(t *testing.T) {
	svc := newRoleSyncSvc()
	r := syncRouter(svc, uuid.New(), "authenticated")
	var wg sync.WaitGroup
	for range 64 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			get(r)
		}()
	}
	wg.Wait()
	if extra := svc.settle(t, true); len(extra) != 0 {
		t.Errorf("concurrent requests caused extra syncs: %v", extra)
	}
}

func TestRoleSyncCache(t *testing.T) {
	c := &roleSyncCache{m: map[uuid.UUID]roleSyncEntry{}}
	id := uuid.New()
	now := time.Now()
	if !c.shouldSync(id, "user", now) {
		t.Error("first call should sync")
	}
	if c.shouldSync(id, "user", now.Add(roleSyncTTL-time.Second)) {
		t.Error("same role within TTL should not sync")
	}
	if !c.shouldSync(id, "admin", now) {
		t.Error("changed role should sync")
	}
	if !c.shouldSync(id, "admin", now.Add(roleSyncTTL)) {
		t.Error("expired entry should sync again")
	}
	for range roleSyncMax + 5 {
		c.shouldSync(uuid.New(), "user", now)
	}
	if len(c.m) > roleSyncMax {
		t.Errorf("cache grew to %d, max %d", len(c.m), roleSyncMax)
	}
}

type failingUserSvc struct{ getErr, syncErr error }

func (s failingUserSvc) GetByID(context.Context, uuid.UUID) (*domain.User, error) {
	return nil, s.getErr
}

func (s failingUserSvc) SyncOnLogin(context.Context, uuid.UUID, string, string) (*domain.User, error) {
	return nil, s.syncErr
}

func (failingUserSvc) SyncRoleToSupabase(context.Context, uuid.UUID, domain.UserRole) {}

// A token claiming admin must not get through when the DB row cannot be loaded.
func TestUserSync_FailsClosed(t *testing.T) {
	for name, svc := range map[string]failingUserSvc{
		"lookup error": {getErr: errors.New("db down")},
		"sync error":   {syncErr: errors.New("duplicate email")},
	} {
		t.Run(name, func(t *testing.T) {
			r := gin.New()
			r.Use(func(c *gin.Context) {
				c.Set(ContextKeyClaims, &Claims{
					RegisteredClaims: jwt.RegisteredClaims{Subject: uuid.NewString()},
					AppMetadata:      map[string]any{"role": "admin"},
				})
			})
			r.Use(UserSyncMiddleware(svc), RequireRole(RoleAdmin))
			r.GET("/x", func(c *gin.Context) { c.Status(http.StatusOK) })

			w := httptest.NewRecorder()
			r.ServeHTTP(w, httptest.NewRequest("GET", "/x", nil))
			if w.Code != http.StatusServiceUnavailable {
				t.Errorf("status = %d, want 503", w.Code)
			}
		})
	}
}
