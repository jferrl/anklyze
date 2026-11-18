package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/repository"
)

func TestStudyService_InvalidatesStatsCache(t *testing.T) {
	ctx := context.Background()
	studyID := uuid.New()

	tests := []struct {
		name string
		repo *mockStudyRepository
		do   func(StudyService)
	}{
		{"AddCase", &mockStudyRepository{}, func(s StudyService) { _ = s.AddCase(ctx, studyID, uuid.New(), 0) }},
		{"AddCases", &mockStudyRepository{}, func(s StudyService) {
			_ = s.AddCases(ctx, studyID, []repository.CaseAssignment{{CaseID: uuid.New()}})
		}},
		{"RemoveCase", &mockStudyRepository{}, func(s StudyService) { _ = s.RemoveCase(ctx, studyID, uuid.New()) }},
		{"RefreshStudy", &mockStudyRepository{}, func(s StudyService) { s.RefreshStudy(ctx, studyID) }},
		{"RefreshStudy with counter failure", &mockStudyRepository{updateCountersErr: errors.New("db error")}, func(s StudyService) { s.RefreshStudy(ctx, studyID) }},
		{"InvalidateStats", &mockStudyRepository{}, func(s StudyService) { s.InvalidateStats(studyID) }},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cache := NewTTLStatsCache(time.Hour)
			cache.Set(studyID, &domain.StudyReliabilityMetrics{})
			svc := NewStudyService(tt.repo, &mockStudyResponseRepository{}, &mockCaseRepositoryForStudy{}, &mockCaseResponseRepository{}, &mockReliabilityCalculator{}, &mockGoldStandardCalculator{}, cache)

			tt.do(svc)

			if _, ok := cache.Get(studyID); ok {
				t.Error("stats cache still holds the study after the change")
			}
		})
	}

	t.Run("failed AddCase keeps cache", func(t *testing.T) {
		cache := NewTTLStatsCache(time.Hour)
		cache.Set(studyID, &domain.StudyReliabilityMetrics{})
		repo := &mockStudyRepository{addCaseErr: errors.New("db error")}
		svc := NewStudyService(repo, &mockStudyResponseRepository{}, &mockCaseRepositoryForStudy{}, &mockCaseResponseRepository{}, &mockReliabilityCalculator{}, &mockGoldStandardCalculator{}, cache)

		if err := svc.AddCase(ctx, studyID, uuid.New(), 0); err == nil {
			t.Fatal("expected error")
		}
		if _, ok := cache.Get(studyID); !ok {
			t.Error("cache dropped although nothing changed")
		}
	})
}
