package postgres

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/repository"
	"gorm.io/datatypes"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func setupCounterTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("open test database: %v", err)
	}
	if err := db.AutoMigrate(&domain.Study{}, &domain.Case{}, &domain.CaseImage{}, &domain.CaseResponse{}); err != nil {
		t.Fatalf("migrate test database: %v", err)
	}
	return db
}

func TestCaseRepository_Update_KeepsCounters(t *testing.T) {
	t.Parallel()

	db := setupCounterTestDB(t)
	repo := NewCaseRepository(db)
	ctx := context.Background()

	cs := createTestCase(t, db, domain.CaseStatusDraft)
	if err := db.Model(&domain.Case{}).Where("id = ?", cs.ID).
		Update("gold_standard", datatypes.JSON(`{"danis_weber":"Weber A"}`)).Error; err != nil {
		t.Fatal(err)
	}

	// stale is read before a response lands.
	stale, err := repo.GetByID(ctx, cs.ID)
	if err != nil || stale == nil {
		t.Fatalf("GetByID() = %v, %v", stale, err)
	}
	if err := NewCaseResponseRepository(db).Save(ctx, newTestResponse(cs.ID, uuid.New())); err != nil {
		t.Fatalf("Save response: %v", err)
	}

	deadline := time.Now().Add(time.Hour).UTC().Truncate(time.Second)
	stale.Title = "renamed"
	stale.Description = ""
	stale.Deadline = &deadline
	stale.GoldStandard = nil
	if err := repo.Update(ctx, stale); err != nil {
		t.Fatalf("Update() error = %v", err)
	}

	got, err := repo.GetByID(ctx, cs.ID)
	if err != nil || got == nil {
		t.Fatalf("GetByID() = %v, %v", got, err)
	}
	if got.ResponseCount != 1 || got.UniqueUsers != 1 {
		t.Errorf("counters = (%d, %d), want (1, 1): stale Update overwrote them", got.ResponseCount, got.UniqueUsers)
	}
	if got.Title != "renamed" || got.Deadline == nil {
		t.Errorf("editable fields not written: title=%q deadline=%v", got.Title, got.Deadline)
	}
	if len(got.GoldStandard) != 0 {
		t.Errorf("gold standard = %s, want cleared", got.GoldStandard)
	}
}

func TestStudyRepository_Update_KeepsCounters(t *testing.T) {
	t.Parallel()

	db := setupCounterTestDB(t)
	repo := NewStudyRepository(db)
	ctx := context.Background()

	study := domain.NewStudy(uuid.New(), "before", "desc")
	if err := repo.Create(ctx, study); err != nil {
		t.Fatal(err)
	}

	stale, err := repo.GetByID(ctx, study.ID)
	if err != nil || stale == nil {
		t.Fatalf("GetByID() = %v, %v", stale, err)
	}
	cs := createTestCase(t, db, domain.CaseStatusPublished)
	if err := repo.AddCase(ctx, study.ID, cs.ID, 0); err != nil {
		t.Fatal(err)
	}
	if err := repo.UpdateCounters(ctx, study.ID); err != nil {
		t.Fatal(err)
	}

	stale.Title = "after"
	stale.Description = ""
	if err := repo.Update(ctx, stale); err != nil {
		t.Fatalf("Update() error = %v", err)
	}

	got, err := repo.GetByID(ctx, study.ID)
	if err != nil || got == nil {
		t.Fatalf("GetByID() = %v, %v", got, err)
	}
	if got.CaseCount != 1 {
		t.Errorf("CaseCount = %d, want 1: stale Update overwrote it", got.CaseCount)
	}
	if got.Title != "after" || got.Description != "" {
		t.Errorf("editable fields not written: title=%q description=%q", got.Title, got.Description)
	}
}

// Every membership or response change must be followed by UpdateCounters; this
// pins that the recount tracks the source rows through each path.
func TestStudyRepository_UpdateCounters_TracksSourceRows(t *testing.T) {
	t.Parallel()

	db := setupCounterTestDB(t)
	studies := NewStudyRepository(db)
	cases := NewCaseRepository(db)
	ctx := context.Background()

	study := domain.NewStudy(uuid.New(), "s", "")
	if err := studies.Create(ctx, study); err != nil {
		t.Fatal(err)
	}
	c1 := createTestCase(t, db, domain.CaseStatusPublished)
	c2 := createTestCase(t, db, domain.CaseStatusPublished)
	u1, u2 := uuid.New(), uuid.New()
	createTestResponse(t, db, c1.ID, u1)
	createTestResponse(t, db, c2.ID, u1)
	createTestResponse(t, db, c1.ID, u2)

	check := func(step string, want domain.Study) {
		t.Helper()
		if err := studies.UpdateCounters(ctx, study.ID); err != nil {
			t.Fatalf("%s: UpdateCounters: %v", step, err)
		}
		got, err := studies.GetByID(ctx, study.ID)
		if err != nil || got == nil {
			t.Fatalf("%s: GetByID() = %v, %v", step, got, err)
		}
		if got.CaseCount != want.CaseCount || got.TotalResponses != want.TotalResponses ||
			got.UniqueRaters != want.UniqueRaters || got.CompleteRaters != want.CompleteRaters {
			t.Errorf("%s: counters = (cases %d, responses %d, raters %d, complete %d), want (%d, %d, %d, %d)", step,
				got.CaseCount, got.TotalResponses, got.UniqueRaters, got.CompleteRaters,
				want.CaseCount, want.TotalResponses, want.UniqueRaters, want.CompleteRaters)
		}
	}

	if err := studies.AddCases(ctx, study.ID, []repository.CaseAssignment{{CaseID: c1.ID}, {CaseID: c2.ID, CaseOrder: 1}}); err != nil {
		t.Fatal(err)
	}
	check("after AddCases", domain.Study{CaseCount: 2, TotalResponses: 3, UniqueRaters: 2, CompleteRaters: 1})

	if err := studies.RemoveCase(ctx, study.ID, c2.ID); err != nil {
		t.Fatal(err)
	}
	check("after RemoveCase", domain.Study{CaseCount: 1, TotalResponses: 2, UniqueRaters: 2, CompleteRaters: 2})

	if err := studies.AddCase(ctx, study.ID, c2.ID, 1); err != nil {
		t.Fatal(err)
	}
	check("after AddCase", domain.Study{CaseCount: 2, TotalResponses: 3, UniqueRaters: 2, CompleteRaters: 1})

	// Deleting a case deletes its responses.
	if err := cases.Delete(ctx, c1.ID); err != nil {
		t.Fatal(err)
	}
	check("after case Delete", domain.Study{CaseCount: 1, TotalResponses: 1, UniqueRaters: 1, CompleteRaters: 1})
}

func newTestResponse(caseID, userID uuid.UUID) *domain.CaseResponse {
	return &domain.CaseResponse{
		ID:             uuid.New(),
		CaseID:         caseID,
		UserID:         userID,
		Classification: datatypes.JSON(`{}`),
	}
}
