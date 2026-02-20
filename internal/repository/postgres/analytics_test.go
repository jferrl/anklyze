package postgres

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func setupAnalyticsTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("failed to open test database: %v", err)
	}

	if err := db.AutoMigrate(&domain.AuditEntry{}); err != nil {
		t.Fatalf("failed to migrate test database: %v", err)
	}

	return db
}

func createAnalyticsTestEntry(createdAt time.Time, lang string, isImpossible bool, dwType, lhType, aoCode *string) *domain.AuditEntry {
	return &domain.AuditEntry{
		ID:              uuid.New(),
		CreatedAt:       createdAt,
		ClientIP:        "127.0.0.1",
		UserAgent:       "test-agent",
		Language:        lang,
		Input:           []byte(`{"involved_malleoli":"lateral_only"}`),
		Result:          []byte(`{"fracture_description":"test"}`),
		IsImpossible:    isImpossible,
		DanisWeberType:  dwType,
		LaugeHansenType: lhType,
		AOOTACode:       aoCode,
		DurationMS:      50,
	}
}

func strPtr(s string) *string {
	return &s
}

func TestNewAnalyticsRepository(t *testing.T) {
	t.Parallel()

	db := setupAnalyticsTestDB(t)
	repo := NewAnalyticsRepository(db)

	if repo == nil {
		t.Error("NewAnalyticsRepository() returned nil")
	}
}

func TestAnalyticsRepository_GetSummary(t *testing.T) {
	t.Parallel()

	now := time.Now()
	yesterday := now.AddDate(0, 0, -1)
	lastWeek := now.AddDate(0, 0, -7)

	tests := []struct {
		name           string
		entries        []*domain.AuditEntry
		from           time.Time
		to             time.Time
		wantTotal      int64
		wantImpossible int64
		wantLangCount  int
	}{
		{
			name:           "empty database",
			entries:        nil,
			from:           lastWeek,
			to:             now,
			wantTotal:      0,
			wantImpossible: 0,
			wantLangCount:  0,
		},
		{
			name: "single entry",
			entries: []*domain.AuditEntry{
				createAnalyticsTestEntry(yesterday, "en", false, strPtr("Weber A"), strPtr("SA"), strPtr("44-A1")),
			},
			from:           lastWeek,
			to:             now,
			wantTotal:      1,
			wantImpossible: 0,
			wantLangCount:  1,
		},
		{
			name: "multiple entries with different languages",
			entries: []*domain.AuditEntry{
				createAnalyticsTestEntry(yesterday, "en", false, strPtr("Weber A"), strPtr("SA"), strPtr("44-A1")),
				createAnalyticsTestEntry(yesterday, "en", false, strPtr("Weber B"), strPtr("SER"), strPtr("44-B1")),
				createAnalyticsTestEntry(yesterday, "es", false, strPtr("Weber C"), strPtr("PER"), strPtr("44-C1")),
			},
			from:           lastWeek,
			to:             now,
			wantTotal:      3,
			wantImpossible: 0,
			wantLangCount:  2,
		},
		{
			name: "entries with impossible classifications",
			entries: []*domain.AuditEntry{
				createAnalyticsTestEntry(yesterday, "en", false, strPtr("Weber A"), strPtr("SA"), strPtr("44-A1")),
				createAnalyticsTestEntry(yesterday, "en", true, nil, nil, nil),
				createAnalyticsTestEntry(yesterday, "en", true, nil, nil, nil),
			},
			from:           lastWeek,
			to:             now,
			wantTotal:      3,
			wantImpossible: 2,
			wantLangCount:  1,
		},
		{
			name: "entries outside date range excluded",
			entries: []*domain.AuditEntry{
				createAnalyticsTestEntry(yesterday, "en", false, strPtr("Weber A"), nil, nil),
				createAnalyticsTestEntry(now.AddDate(0, 0, -10), "en", false, strPtr("Weber B"), nil, nil), // outside range
			},
			from:           now.AddDate(0, 0, -5),
			to:             now,
			wantTotal:      1,
			wantImpossible: 0,
			wantLangCount:  1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			db := setupAnalyticsTestDB(t)

			// Insert test entries
			for _, entry := range tt.entries {
				if err := db.Create(entry).Error; err != nil {
					t.Fatalf("failed to create test entry: %v", err)
				}
			}

			repo := NewAnalyticsRepository(db)
			summary, err := repo.GetSummary(tt.from, tt.to)

			if err != nil {
				t.Fatalf("GetSummary() error = %v", err)
			}

			if summary.TotalClassifications != tt.wantTotal {
				t.Errorf("TotalClassifications = %d, want %d", summary.TotalClassifications, tt.wantTotal)
			}

			if summary.ImpossibleCount != tt.wantImpossible {
				t.Errorf("ImpossibleCount = %d, want %d", summary.ImpossibleCount, tt.wantImpossible)
			}

			if len(summary.LanguageDistribution) != tt.wantLangCount {
				t.Errorf("LanguageDistribution count = %d, want %d", len(summary.LanguageDistribution), tt.wantLangCount)
			}

			// Verify period is set correctly
			if !summary.Period.From.Equal(tt.from) {
				t.Errorf("Period.From = %v, want %v", summary.Period.From, tt.from)
			}
			if !summary.Period.To.Equal(tt.to) {
				t.Errorf("Period.To = %v, want %v", summary.Period.To, tt.to)
			}
		})
	}
}

func TestAnalyticsRepository_GetSummary_Distributions(t *testing.T) {
	t.Parallel()

	now := time.Now()
	yesterday := now.AddDate(0, 0, -1)
	lastWeek := now.AddDate(0, 0, -7)

	db := setupAnalyticsTestDB(t)

	// Create entries with various classification types
	entries := []*domain.AuditEntry{
		createAnalyticsTestEntry(yesterday, "en", false, strPtr("Weber A"), strPtr("SA"), strPtr("44-A1")),
		createAnalyticsTestEntry(yesterday, "en", false, strPtr("Weber A"), strPtr("SA"), strPtr("44-A1")),
		createAnalyticsTestEntry(yesterday, "en", false, strPtr("Weber B"), strPtr("SER"), strPtr("44-B1")),
		createAnalyticsTestEntry(yesterday, "es", false, strPtr("Weber C"), strPtr("PER"), strPtr("44-C1")),
	}

	for _, entry := range entries {
		if err := db.Create(entry).Error; err != nil {
			t.Fatalf("failed to create test entry: %v", err)
		}
	}

	repo := NewAnalyticsRepository(db)
	summary, err := repo.GetSummary(lastWeek, now)

	if err != nil {
		t.Fatalf("GetSummary() error = %v", err)
	}

	// Check Danis-Weber distribution
	if summary.DanisWeberDistribution["Weber A"] != 2 {
		t.Errorf("DanisWeberDistribution[Weber A] = %d, want 2", summary.DanisWeberDistribution["Weber A"])
	}
	if summary.DanisWeberDistribution["Weber B"] != 1 {
		t.Errorf("DanisWeberDistribution[Weber B] = %d, want 1", summary.DanisWeberDistribution["Weber B"])
	}
	if summary.DanisWeberDistribution["Weber C"] != 1 {
		t.Errorf("DanisWeberDistribution[Weber C] = %d, want 1", summary.DanisWeberDistribution["Weber C"])
	}

	// Check Lauge-Hansen distribution
	if summary.LaugeHansenDistribution["SA"] != 2 {
		t.Errorf("LaugeHansenDistribution[SA] = %d, want 2", summary.LaugeHansenDistribution["SA"])
	}
	if summary.LaugeHansenDistribution["SER"] != 1 {
		t.Errorf("LaugeHansenDistribution[SER] = %d, want 1", summary.LaugeHansenDistribution["SER"])
	}

	// Check AO/OTA distribution
	if summary.AOOTADistribution["44-A1"] != 2 {
		t.Errorf("AOOTADistribution[44-A1] = %d, want 2", summary.AOOTADistribution["44-A1"])
	}

	// Check language distribution
	if summary.LanguageDistribution["en"] != 3 {
		t.Errorf("LanguageDistribution[en] = %d, want 3", summary.LanguageDistribution["en"])
	}
	if summary.LanguageDistribution["es"] != 1 {
		t.Errorf("LanguageDistribution[es] = %d, want 1", summary.LanguageDistribution["es"])
	}
}

func TestAnalyticsRepository_GetDistribution(t *testing.T) {
	t.Parallel()

	now := time.Now()
	yesterday := now.AddDate(0, 0, -1)
	lastWeek := now.AddDate(0, 0, -7)

	tests := []struct {
		name       string
		system     string
		entries    []*domain.AuditEntry
		wantTotal  int64
		wantItems  int
		wantValues map[string]int64
	}{
		{
			name:       "danis-weber distribution",
			system:     "danis-weber",
			entries:    []*domain.AuditEntry{
				createAnalyticsTestEntry(yesterday, "en", false, strPtr("Weber A"), nil, nil),
				createAnalyticsTestEntry(yesterday, "en", false, strPtr("Weber A"), nil, nil),
				createAnalyticsTestEntry(yesterday, "en", false, strPtr("Weber B"), nil, nil),
			},
			wantTotal:  3,
			wantItems:  2,
			wantValues: map[string]int64{"Weber A": 2, "Weber B": 1},
		},
		{
			name:       "lauge-hansen distribution",
			system:     "lauge-hansen",
			entries:    []*domain.AuditEntry{
				createAnalyticsTestEntry(yesterday, "en", false, nil, strPtr("SA"), nil),
				createAnalyticsTestEntry(yesterday, "en", false, nil, strPtr("SER"), nil),
				createAnalyticsTestEntry(yesterday, "en", false, nil, strPtr("SER"), nil),
			},
			wantTotal:  3,
			wantItems:  2,
			wantValues: map[string]int64{"SA": 1, "SER": 2},
		},
		{
			name:       "ao-ota distribution",
			system:     "ao-ota",
			entries:    []*domain.AuditEntry{
				createAnalyticsTestEntry(yesterday, "en", false, nil, nil, strPtr("44-A1")),
				createAnalyticsTestEntry(yesterday, "en", false, nil, nil, strPtr("44-B1")),
				createAnalyticsTestEntry(yesterday, "en", false, nil, nil, strPtr("44-C1")),
			},
			wantTotal:  3,
			wantItems:  3,
			wantValues: map[string]int64{"44-A1": 1, "44-B1": 1, "44-C1": 1},
		},
		{
			name:       "unknown system returns empty",
			system:     "unknown",
			entries:    []*domain.AuditEntry{
				createAnalyticsTestEntry(yesterday, "en", false, strPtr("Weber A"), strPtr("SA"), strPtr("44-A1")),
			},
			wantTotal:  0,
			wantItems:  0,
			wantValues: nil,
		},
		{
			name:       "empty database",
			system:     "danis-weber",
			entries:    nil,
			wantTotal:  0,
			wantItems:  0,
			wantValues: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			db := setupAnalyticsTestDB(t)

			for _, entry := range tt.entries {
				if err := db.Create(entry).Error; err != nil {
					t.Fatalf("failed to create test entry: %v", err)
				}
			}

			repo := NewAnalyticsRepository(db)
			dist, err := repo.GetDistribution(tt.system, lastWeek, now)

			if err != nil {
				t.Fatalf("GetDistribution() error = %v", err)
			}

			if dist.System != tt.system {
				t.Errorf("System = %s, want %s", dist.System, tt.system)
			}

			if dist.Total != tt.wantTotal {
				t.Errorf("Total = %d, want %d", dist.Total, tt.wantTotal)
			}

			if len(dist.Distribution) != tt.wantItems {
				t.Errorf("Distribution items = %d, want %d", len(dist.Distribution), tt.wantItems)
			}

			// Verify specific values
			for _, item := range dist.Distribution {
				if expected, ok := tt.wantValues[item.Value]; ok {
					if item.Count != expected {
						t.Errorf("Distribution[%s] = %d, want %d", item.Value, item.Count, expected)
					}
				}
			}
		})
	}
}

func TestAnalyticsRepository_GetDistribution_Percentages(t *testing.T) {
	t.Parallel()

	now := time.Now()
	yesterday := now.AddDate(0, 0, -1)
	lastWeek := now.AddDate(0, 0, -7)

	db := setupAnalyticsTestDB(t)

	// Create 4 entries: 2 Weber A, 1 Weber B, 1 Weber C
	entries := []*domain.AuditEntry{
		createAnalyticsTestEntry(yesterday, "en", false, strPtr("Weber A"), nil, nil),
		createAnalyticsTestEntry(yesterday, "en", false, strPtr("Weber A"), nil, nil),
		createAnalyticsTestEntry(yesterday, "en", false, strPtr("Weber B"), nil, nil),
		createAnalyticsTestEntry(yesterday, "en", false, strPtr("Weber C"), nil, nil),
	}

	for _, entry := range entries {
		if err := db.Create(entry).Error; err != nil {
			t.Fatalf("failed to create test entry: %v", err)
		}
	}

	repo := NewAnalyticsRepository(db)
	dist, err := repo.GetDistribution("danis-weber", lastWeek, now)

	if err != nil {
		t.Fatalf("GetDistribution() error = %v", err)
	}

	// Find Weber A and check its percentage (should be 50%)
	for _, item := range dist.Distribution {
		if item.Value == "Weber A" {
			expectedPercentage := 50.0
			if item.Percentage != expectedPercentage {
				t.Errorf("Weber A percentage = %f, want %f", item.Percentage, expectedPercentage)
			}
		}
		if item.Value == "Weber B" || item.Value == "Weber C" {
			expectedPercentage := 25.0
			if item.Percentage != expectedPercentage {
				t.Errorf("%s percentage = %f, want %f", item.Value, item.Percentage, expectedPercentage)
			}
		}
	}
}

// Note: GetTrends uses DATE_TRUNC which is PostgreSQL-specific and not available in SQLite.
// These tests verify the basic interface contract but cannot fully test temporal aggregation.
func TestAnalyticsRepository_GetTrends_BasicContract(t *testing.T) {
	t.Parallel()

	now := time.Now()
	lastWeek := now.AddDate(0, 0, -7)

	tests := []struct {
		name        string
		granularity domain.Granularity
	}{
		{
			name:        "day granularity",
			granularity: domain.GranularityDay,
		},
		{
			name:        "week granularity",
			granularity: domain.GranularityWeek,
		},
		{
			name:        "month granularity",
			granularity: domain.GranularityMonth,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			db := setupAnalyticsTestDB(t)
			repo := NewAnalyticsRepository(db)

			// This will fail on SQLite due to DATE_TRUNC, but we're testing the interface
			trend, err := repo.GetTrends(lastWeek, now, tt.granularity)

			// SQLite doesn't support DATE_TRUNC, so we expect an error
			// In production with PostgreSQL, this would succeed
			if err != nil {
				t.Skipf("Skipping trend test - requires PostgreSQL (error: %v)", err)
			}

			if trend == nil {
				t.Fatal("GetTrends() returned nil")
			}

			if trend.Granularity != string(tt.granularity) {
				t.Errorf("Granularity = %s, want %s", trend.Granularity, tt.granularity)
			}

			if !trend.Period.From.Equal(lastWeek) {
				t.Errorf("Period.From = %v, want %v", trend.Period.From, lastWeek)
			}
		})
	}
}
