package postgres

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
	"gorm.io/datatypes"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func setupDashboardTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("failed to open test database: %v", err)
	}

	if err := db.AutoMigrate(&domain.Case{}, &domain.CaseResponse{}); err != nil {
		t.Fatalf("failed to migrate test database: %v", err)
	}

	return db
}

func createTestCase(t *testing.T, db *gorm.DB, status domain.CaseStatus) domain.Case {
	t.Helper()

	cs := domain.Case{
		ID:        uuid.New(),
		CreatedBy: uuid.New(),
		Title:     "Test Case",
		Status:    status,
	}
	if err := db.Create(&cs).Error; err != nil {
		t.Fatalf("failed to create test case: %v", err)
	}
	return cs
}

func createTestResponse(t *testing.T, db *gorm.DB, caseID, userID uuid.UUID) {
	t.Helper()

	resp := domain.CaseResponse{
		ID:             uuid.New(),
		CaseID:         caseID,
		UserID:         userID,
		Classification: datatypes.JSON([]byte(`{}`)),
	}
	if err := db.Create(&resp).Error; err != nil {
		t.Fatalf("failed to create test response: %v", err)
	}
}

func TestGetDashboardStats_UniqueUsersCountsDistinctUsers(t *testing.T) {
	t.Parallel()

	db := setupDashboardTestDB(t)
	repo := NewCaseRepository(db)
	ctx := context.Background()

	// Create multiple cases
	case1 := createTestCase(t, db, domain.CaseStatusPublished)
	case2 := createTestCase(t, db, domain.CaseStatusPublished)
	case3 := createTestCase(t, db, domain.CaseStatusPublished)

	// One user responds to all 3 cases — this is the scenario that triggered the bug.
	// The old SUM(unique_users) query would return 3 instead of 1.
	singleUser := uuid.New()
	createTestResponse(t, db, case1.ID, singleUser)
	createTestResponse(t, db, case2.ID, singleUser)
	createTestResponse(t, db, case3.ID, singleUser)

	// Update denormalized counters (as the app would)
	for _, cs := range []domain.Case{case1, case2, case3} {
		db.Model(&domain.Case{}).Where("id = ?", cs.ID).Updates(map[string]interface{}{
			"response_count": 1,
			"unique_users":   1,
		})
	}

	stats, err := repo.GetDashboardStats(ctx)
	if err != nil {
		t.Fatalf("GetDashboardStats() error = %v", err)
	}

	if stats.TotalUniqueUsers != 1 {
		t.Errorf("TotalUniqueUsers = %d, want 1 (one user across 3 cases)", stats.TotalUniqueUsers)
	}
	if stats.TotalResponses != 3 {
		t.Errorf("TotalResponses = %d, want 3", stats.TotalResponses)
	}
}

func TestGetDashboardStats_MultipleDistinctUsers(t *testing.T) {
	t.Parallel()

	db := setupDashboardTestDB(t)
	repo := NewCaseRepository(db)
	ctx := context.Background()

	case1 := createTestCase(t, db, domain.CaseStatusPublished)
	case2 := createTestCase(t, db, domain.CaseStatusPublished)

	user1 := uuid.New()
	user2 := uuid.New()
	user3 := uuid.New()

	// user1 responds to both cases
	createTestResponse(t, db, case1.ID, user1)
	createTestResponse(t, db, case2.ID, user1)
	// user2 responds to case1 only
	createTestResponse(t, db, case1.ID, user2)
	// user3 responds to case2 only
	createTestResponse(t, db, case2.ID, user3)

	// Denormalized counters: case1 has 2 unique users, case2 has 2 unique users
	db.Model(&domain.Case{}).Where("id = ?", case1.ID).Updates(map[string]interface{}{
		"response_count": 2,
		"unique_users":   2,
	})
	db.Model(&domain.Case{}).Where("id = ?", case2.ID).Updates(map[string]interface{}{
		"response_count": 2,
		"unique_users":   2,
	})

	stats, err := repo.GetDashboardStats(ctx)
	if err != nil {
		t.Fatalf("GetDashboardStats() error = %v", err)
	}

	// 3 distinct users total, NOT 4 (which SUM(unique_users) would give)
	if stats.TotalUniqueUsers != 3 {
		t.Errorf("TotalUniqueUsers = %d, want 3 (three distinct users across 2 cases)", stats.TotalUniqueUsers)
	}
	if stats.TotalResponses != 4 {
		t.Errorf("TotalResponses = %d, want 4", stats.TotalResponses)
	}
}

func TestGetDashboardStats_NoResponses(t *testing.T) {
	t.Parallel()

	db := setupDashboardTestDB(t)
	repo := NewCaseRepository(db)
	ctx := context.Background()

	// Cases exist but no responses
	createTestCase(t, db, domain.CaseStatusDraft)
	createTestCase(t, db, domain.CaseStatusPublished)

	stats, err := repo.GetDashboardStats(ctx)
	if err != nil {
		t.Fatalf("GetDashboardStats() error = %v", err)
	}

	if stats.TotalUniqueUsers != 0 {
		t.Errorf("TotalUniqueUsers = %d, want 0", stats.TotalUniqueUsers)
	}
	if stats.TotalCases != 2 {
		t.Errorf("TotalCases = %d, want 2", stats.TotalCases)
	}
}

func TestGetDashboardStats_StatusCounts(t *testing.T) {
	t.Parallel()

	db := setupDashboardTestDB(t)
	repo := NewCaseRepository(db)
	ctx := context.Background()

	createTestCase(t, db, domain.CaseStatusDraft)
	createTestCase(t, db, domain.CaseStatusDraft)
	createTestCase(t, db, domain.CaseStatusPublished)
	createTestCase(t, db, domain.CaseStatusClosed)

	stats, err := repo.GetDashboardStats(ctx)
	if err != nil {
		t.Fatalf("GetDashboardStats() error = %v", err)
	}

	if stats.TotalCases != 4 {
		t.Errorf("TotalCases = %d, want 4", stats.TotalCases)
	}
	if stats.DraftCases != 2 {
		t.Errorf("DraftCases = %d, want 2", stats.DraftCases)
	}
	if stats.PublishedCases != 1 {
		t.Errorf("PublishedCases = %d, want 1", stats.PublishedCases)
	}
	if stats.ClosedCases != 1 {
		t.Errorf("ClosedCases = %d, want 1", stats.ClosedCases)
	}
}
