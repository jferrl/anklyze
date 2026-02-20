package domain

import (
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

// ptr returns a pointer to the given value. Used as a concise helper in table
// test definitions where taking the address of a literal is not permitted.
func ptr[T any](v T) *T {
	return &v
}

// newDraftCase returns a minimal draft Case suitable for use in tests.
func newDraftCase() Case {
	return Case{
		ID:        uuid.New(),
		CreatedBy: uuid.New(),
		Title:     "Test Case",
		Status:    CaseStatusDraft,
	}
}

// newPublishedCase returns a published Case with no deadline.
func newPublishedCase() Case {
	c := newDraftCase()
	c.Status = CaseStatusPublished
	now := time.Now()
	c.PublishedAt = &now
	return c
}

// newClosedCase returns a closed Case.
func newClosedCase() Case {
	c := newPublishedCase()
	c.Status = CaseStatusClosed
	now := time.Now()
	c.ClosedAt = &now
	return c
}

// withDeadline returns a copy of c with the given deadline set.
func withDeadline(c Case, d time.Time) Case {
	c.Deadline = &d
	return c
}

// withStudyID returns a copy of c with a non-nil StudyID.
func withStudyID(c Case) Case {
	id := uuid.New()
	c.StudyID = &id
	return c
}

// mustMarshalClassification serialises r into datatypes.JSON or panics. Only
// intended for use inside tests where a panic on bad data is acceptable.
func mustMarshalClassification(r *ClassificationResult) datatypes.JSON {
	b, err := json.Marshal(r)
	if err != nil {
		panic(err)
	}
	return datatypes.JSON(b)
}

// ---------------------------------------------------------------------------
// T007 – Existing methods
// ---------------------------------------------------------------------------

func TestCase_CanBeEdited(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		c    Case
		want bool
	}{
		{
			name: "draft case can be edited",
			c:    newDraftCase(),
			want: true,
		},
		{
			name: "published case cannot be edited",
			c:    newPublishedCase(),
			want: false,
		},
		{
			name: "closed case cannot be edited",
			c:    newClosedCase(),
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := tt.c.CanBeEdited(); got != tt.want {
				t.Errorf("CanBeEdited() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestCase_CanAcceptResponses(t *testing.T) {
	t.Parallel()

	past := time.Now().Add(-24 * time.Hour)
	future := time.Now().Add(24 * time.Hour)

	tests := []struct {
		name string
		c    Case
		want bool
	}{
		{
			name: "published case with no deadline accepts responses",
			c:    newPublishedCase(),
			want: true,
		},
		{
			name: "published case with future deadline accepts responses",
			c:    withDeadline(newPublishedCase(), future),
			want: true,
		},
		{
			name: "published case with past deadline does not accept responses",
			c:    withDeadline(newPublishedCase(), past),
			want: false,
		},
		{
			name: "draft case does not accept responses",
			c:    newDraftCase(),
			want: false,
		},
		{
			name: "closed case does not accept responses",
			c:    newClosedCase(),
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := tt.c.CanAcceptResponses(); got != tt.want {
				t.Errorf("CanAcceptResponses() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestCase_IsExpired(t *testing.T) {
	t.Parallel()

	past := time.Now().Add(-24 * time.Hour)
	future := time.Now().Add(24 * time.Hour)

	tests := []struct {
		name string
		c    Case
		want bool
	}{
		{
			name: "nil deadline is not expired",
			c:    newDraftCase(),
			want: false,
		},
		{
			name: "future deadline is not expired",
			c:    withDeadline(newDraftCase(), future),
			want: false,
		},
		{
			name: "past deadline is expired",
			c:    withDeadline(newDraftCase(), past),
			want: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := tt.c.IsExpired(); got != tt.want {
				t.Errorf("IsExpired() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestCase_CanBeDeleted(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		c    Case
		want bool
	}{
		{
			name: "draft case can always be deleted",
			c:    newDraftCase(),
			want: true,
		},
		{
			name: "published case can always be deleted",
			c:    newPublishedCase(),
			want: true,
		},
		{
			name: "closed case can always be deleted",
			c:    newClosedCase(),
			want: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := tt.c.CanBeDeleted(); got != tt.want {
				t.Errorf("CanBeDeleted() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestCase_BelongsToStudy(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		c    Case
		want bool
	}{
		{
			name: "nil StudyID does not belong to a study",
			c:    newDraftCase(),
			want: false,
		},
		{
			name: "set StudyID belongs to a study",
			c:    withStudyID(newDraftCase()),
			want: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := tt.c.BelongsToStudy(); got != tt.want {
				t.Errorf("BelongsToStudy() = %v, want %v", got, tt.want)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// T008 – CanPublish / CanClose
// ---------------------------------------------------------------------------

func TestCase_CanPublish(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		c         Case
		hasImages bool
		wantErr   error
	}{
		{
			name:      "draft case with images can be published",
			c:         newDraftCase(),
			hasImages: true,
			wantErr:   nil,
		},
		{
			name:      "draft case without images returns ErrMissingImages",
			c:         newDraftCase(),
			hasImages: false,
			wantErr:   ErrMissingImages,
		},
		{
			name:      "published case returns ErrInvalidStateTransition",
			c:         newPublishedCase(),
			hasImages: true,
			wantErr:   ErrInvalidStateTransition,
		},
		{
			name:      "closed case returns ErrInvalidStateTransition",
			c:         newClosedCase(),
			hasImages: true,
			wantErr:   ErrInvalidStateTransition,
		},
		{
			name:      "published case without images still returns ErrInvalidStateTransition (status checked first)",
			c:         newPublishedCase(),
			hasImages: false,
			wantErr:   ErrInvalidStateTransition,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			err := tt.c.CanPublish(tt.hasImages)
			if tt.wantErr == nil {
				if err != nil {
					t.Errorf("CanPublish(%v) returned unexpected error: %v", tt.hasImages, err)
				}
				return
			}
			if !errors.Is(err, tt.wantErr) {
				t.Errorf("CanPublish(%v) error = %v, want %v", tt.hasImages, err, tt.wantErr)
			}
		})
	}
}

func TestCase_CanClose(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		c       Case
		wantErr error
	}{
		{
			name:    "published case can be closed",
			c:       newPublishedCase(),
			wantErr: nil,
		},
		{
			name:    "draft case returns ErrInvalidStateTransition",
			c:       newDraftCase(),
			wantErr: ErrInvalidStateTransition,
		},
		{
			name:    "closed case returns ErrInvalidStateTransition",
			c:       newClosedCase(),
			wantErr: ErrInvalidStateTransition,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			err := tt.c.CanClose()
			if tt.wantErr == nil {
				if err != nil {
					t.Errorf("CanClose() returned unexpected error: %v", err)
				}
				return
			}
			if !errors.Is(err, tt.wantErr) {
				t.Errorf("CanClose() error = %v, want %v", err, tt.wantErr)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// T009 – ValidateResponseSubmission
// ---------------------------------------------------------------------------

func TestCase_ValidateResponseSubmission(t *testing.T) {
	t.Parallel()

	past := time.Now().Add(-24 * time.Hour)
	future := time.Now().Add(24 * time.Hour)

	// A published case that allows multiple responses (the default).
	publishedMulti := newPublishedCase()
	publishedMulti.AllowMultipleResponses = true

	// A published case that only allows a single response.
	publishedSingle := newPublishedCase()
	publishedSingle.AllowMultipleResponses = false

	// Published case whose deadline has passed.
	publishedExpired := withDeadline(newPublishedCase(), past)

	// Published case with a future deadline.
	publishedFuture := withDeadline(newPublishedCase(), future)

	tests := []struct {
		name         string
		c            Case
		isAdmin      bool
		hasResponded bool
		wantErr      error
	}{
		{
			name:         "admin always bypasses all checks",
			c:            newDraftCase(),
			isAdmin:      true,
			hasResponded: true,
			wantErr:      nil,
		},
		{
			name:         "admin bypasses closed case check",
			c:            newClosedCase(),
			isAdmin:      true,
			hasResponded: false,
			wantErr:      nil,
		},
		{
			name:         "non-published case returns ErrCaseNotAcceptingResponses",
			c:            newDraftCase(),
			isAdmin:      false,
			hasResponded: false,
			wantErr:      ErrCaseNotAcceptingResponses,
		},
		{
			name:         "closed case returns ErrCaseNotAcceptingResponses",
			c:            newClosedCase(),
			isAdmin:      false,
			hasResponded: false,
			wantErr:      ErrCaseNotAcceptingResponses,
		},
		{
			name:         "expired published case returns ErrDeadlinePassed",
			c:            publishedExpired,
			isAdmin:      false,
			hasResponded: false,
			wantErr:      ErrDeadlinePassed,
		},
		{
			name:         "single-response mode with prior response returns ErrAlreadyResponded",
			c:            publishedSingle,
			isAdmin:      false,
			hasResponded: true,
			wantErr:      ErrAlreadyResponded,
		},
		{
			name:         "multi-response mode with prior response is allowed",
			c:            publishedMulti,
			isAdmin:      false,
			hasResponded: true,
			wantErr:      nil,
		},
		{
			name:         "published not-expired not-responded in single-response mode is allowed",
			c:            publishedSingle,
			isAdmin:      false,
			hasResponded: false,
			wantErr:      nil,
		},
		{
			name:         "published not-expired not-responded in multi-response mode is allowed",
			c:            publishedMulti,
			isAdmin:      false,
			hasResponded: false,
			wantErr:      nil,
		},
		{
			name:         "published with future deadline is allowed",
			c:            publishedFuture,
			isAdmin:      false,
			hasResponded: false,
			wantErr:      nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			err := tt.c.ValidateResponseSubmission(tt.isAdmin, tt.hasResponded)
			if tt.wantErr == nil {
				if err != nil {
					t.Errorf("ValidateResponseSubmission(%v, %v) returned unexpected error: %v",
						tt.isAdmin, tt.hasResponded, err)
				}
				return
			}
			if !errors.Is(err, tt.wantErr) {
				t.Errorf("ValidateResponseSubmission(%v, %v) error = %v, want %v",
					tt.isAdmin, tt.hasResponded, err, tt.wantErr)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// T010 – CompareWithReference / IsPublished
// ---------------------------------------------------------------------------

func TestCase_IsPublished(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		c    Case
		want bool
	}{
		{
			name: "published case returns true",
			c:    newPublishedCase(),
			want: true,
		},
		{
			name: "draft case returns false",
			c:    newDraftCase(),
			want: false,
		},
		{
			name: "closed case returns false",
			c:    newClosedCase(),
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := tt.c.IsPublished(); got != tt.want {
				t.Errorf("IsPublished() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestCase_CompareWithReference(t *testing.T) {
	t.Parallel()

	// Reference classification uses all four systems.
	reference := &ClassificationResult{
		DanisWeber:  &DanisWeberClassification{Type: DanisWeberB},
		LaugeHansen: &LaugeHansenClassification{Type: LaugeHansenSER},
		AOOTA:       &AOOTAClassification{Code: AOOTAB1},
		Bartonicek:  &BartonicekClassification{Type: BartonicekType2},
	}

	// Helper: build a case with the given reference classification pre-serialised.
	caseWithRef := func(ref *ClassificationResult) Case {
		c := newPublishedCase()
		if ref != nil {
			c.ReferenceClassification = mustMarshalClassification(ref)
		}
		return c
	}

	// User result that exactly matches the reference.
	fullMatchResult := &ClassificationResult{
		DanisWeber:  &DanisWeberClassification{Type: DanisWeberB},
		LaugeHansen: &LaugeHansenClassification{Type: LaugeHansenSER},
		AOOTA:       &AOOTAClassification{Code: AOOTAB1},
		Bartonicek:  &BartonicekClassification{Type: BartonicekType2},
	}

	// User result that matches only DanisWeber and LaugeHansen (2 of 4).
	partialMatchResult := &ClassificationResult{
		DanisWeber:  &DanisWeberClassification{Type: DanisWeberB},   // match
		LaugeHansen: &LaugeHansenClassification{Type: LaugeHansenSER}, // match
		AOOTA:       &AOOTAClassification{Code: AOOTAC1},             // mismatch
		Bartonicek:  &BartonicekClassification{Type: BartonicekType4}, // mismatch
	}

	// User result that matches none of the four systems.
	noMatchResult := &ClassificationResult{
		DanisWeber:  &DanisWeberClassification{Type: DanisWeberA},
		LaugeHansen: &LaugeHansenClassification{Type: LaugeHansenPA},
		AOOTA:       &AOOTAClassification{Code: AOOTAC3},
		Bartonicek:  &BartonicekClassification{Type: BartonicekType1},
	}

	tests := []struct {
		name       string
		c          Case
		userResult *ClassificationResult
		// wantNil signals the test expects CompareWithReference to return nil.
		wantNil         bool
		wantDW          bool
		wantLH          bool
		wantAOOTA       bool
		wantBartonicek  bool
		wantAccuracy    float64
	}{
		{
			name:           "nil reference classification returns nil",
			c:              newPublishedCase(), // no ReferenceClassification set
			userResult:     fullMatchResult,
			wantNil:        true,
		},
		{
			name:            "full match across all four systems yields accuracy 1.0",
			c:               caseWithRef(reference),
			userResult:      fullMatchResult,
			wantNil:         false,
			wantDW:          true,
			wantLH:          true,
			wantAOOTA:       true,
			wantBartonicek:  true,
			wantAccuracy:    1.0,
		},
		{
			name:            "partial match of 2 of 4 systems yields accuracy 0.5",
			c:               caseWithRef(reference),
			userResult:      partialMatchResult,
			wantNil:         false,
			wantDW:          true,
			wantLH:          true,
			wantAOOTA:       false,
			wantBartonicek:  false,
			wantAccuracy:    0.5,
		},
		{
			name:            "no system matches yields accuracy 0.0",
			c:               caseWithRef(reference),
			userResult:      noMatchResult,
			wantNil:         false,
			wantDW:          false,
			wantLH:          false,
			wantAOOTA:       false,
			wantBartonicek:  false,
			wantAccuracy:    0.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got := tt.c.CompareWithReference(tt.userResult)

			if tt.wantNil {
				if got != nil {
					t.Errorf("CompareWithReference() = %+v, want nil", got)
				}
				return
			}

			if got == nil {
				t.Fatal("CompareWithReference() = nil, want non-nil result")
			}

			if got.DanisWeberMatch != tt.wantDW {
				t.Errorf("DanisWeberMatch = %v, want %v", got.DanisWeberMatch, tt.wantDW)
			}
			if got.LaugeHansenMatch != tt.wantLH {
				t.Errorf("LaugeHansenMatch = %v, want %v", got.LaugeHansenMatch, tt.wantLH)
			}
			if got.AOOTAMatch != tt.wantAOOTA {
				t.Errorf("AOOTAMatch = %v, want %v", got.AOOTAMatch, tt.wantAOOTA)
			}
			if got.BartonicekMatch != tt.wantBartonicek {
				t.Errorf("BartonicekMatch = %v, want %v", got.BartonicekMatch, tt.wantBartonicek)
			}
			if got.OverallAccuracy != tt.wantAccuracy {
				t.Errorf("OverallAccuracy = %v, want %v", got.OverallAccuracy, tt.wantAccuracy)
			}
		})
	}
}

// TestCase_CompareWithReference_PartialSystems verifies the accuracy calculation
// when not all four classification systems are populated in both the reference
// and the user result. Only populated systems on both sides should count toward
// the total and the accuracy denominator.
func TestCase_CompareWithReference_PartialSystems(t *testing.T) {
	t.Parallel()

	// Reference has only two systems set.
	reference := &ClassificationResult{
		DanisWeber: &DanisWeberClassification{Type: DanisWeberB},
		AOOTA:      &AOOTAClassification{Code: AOOTAB2},
		// LaugeHansen and Bartonicek intentionally absent.
	}

	c := newPublishedCase()
	c.ReferenceClassification = mustMarshalClassification(reference)

	// User matches DanisWeber, misses AOOTA. LaugeHansen and Bartonicek are
	// present in the user result but absent from the reference, so they must
	// not contribute to total or matched counts.
	userResult := &ClassificationResult{
		DanisWeber:  &DanisWeberClassification{Type: DanisWeberB},
		LaugeHansen: &LaugeHansenClassification{Type: LaugeHansenSA},
		AOOTA:       &AOOTAClassification{Code: AOOTAC2},
	}

	got := c.CompareWithReference(userResult)
	if got == nil {
		t.Fatal("CompareWithReference() = nil, want non-nil result")
	}

	if !got.DanisWeberMatch {
		t.Errorf("DanisWeberMatch = false, want true")
	}
	if got.AOOTAMatch {
		t.Errorf("AOOTAMatch = true, want false")
	}
	// Expected: 1 match out of 2 comparable systems = 0.5.
	const wantAccuracy = 0.5
	if got.OverallAccuracy != wantAccuracy {
		t.Errorf("OverallAccuracy = %v, want %v", got.OverallAccuracy, wantAccuracy)
	}
}

// TestCase_CompareWithReference_NoOverlappingSystems verifies that when neither
// the reference nor the user result share any populated classification systems,
// the comparison returns a non-nil result with zero accuracy (total = 0).
func TestCase_CompareWithReference_NoOverlappingSystems(t *testing.T) {
	t.Parallel()

	// Reference has only DanisWeber.
	reference := &ClassificationResult{
		DanisWeber: &DanisWeberClassification{Type: DanisWeberA},
	}

	c := newPublishedCase()
	c.ReferenceClassification = mustMarshalClassification(reference)

	// User only has LaugeHansen — no overlap with reference.
	userResult := &ClassificationResult{
		LaugeHansen: &LaugeHansenClassification{Type: LaugeHansenPER},
	}

	got := c.CompareWithReference(userResult)
	if got == nil {
		t.Fatal("CompareWithReference() = nil, want non-nil result")
	}

	// total == 0, so OverallAccuracy must remain 0.0.
	if got.OverallAccuracy != 0.0 {
		t.Errorf("OverallAccuracy = %v, want 0.0", got.OverallAccuracy)
	}
}
