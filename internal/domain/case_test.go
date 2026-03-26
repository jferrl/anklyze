package domain

import (
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
)

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

	tests := []struct {
		name         string
		c            Case
		hasResponded bool
		wantErr      error
	}{
		{
			name:         "already responded returns ErrAlreadyResponded",
			c:            newPublishedCase(),
			hasResponded: true,
			wantErr:      ErrAlreadyResponded,
		},
		{
			name:         "already responded on draft case returns ErrAlreadyResponded",
			c:            newDraftCase(),
			hasResponded: true,
			wantErr:      ErrAlreadyResponded,
		},
		{
			name:         "non-published case returns ErrCaseNotAcceptingResponses",
			c:            newDraftCase(),
			hasResponded: false,
			wantErr:      ErrCaseNotAcceptingResponses,
		},
		{
			name:         "closed case returns ErrCaseNotAcceptingResponses",
			c:            newClosedCase(),
			hasResponded: false,
			wantErr:      ErrCaseNotAcceptingResponses,
		},
		{
			name:         "expired published case returns ErrDeadlinePassed",
			c:            withDeadline(newPublishedCase(), past),
			hasResponded: false,
			wantErr:      ErrDeadlinePassed,
		},
		{
			name:         "published not-responded is allowed",
			c:            newPublishedCase(),
			hasResponded: false,
			wantErr:      nil,
		},
		{
			name:         "published with future deadline is allowed",
			c:            withDeadline(newPublishedCase(), future),
			hasResponded: false,
			wantErr:      nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			err := tt.c.ValidateResponseSubmission(tt.hasResponded)
			if tt.wantErr == nil {
				if err != nil {
					t.Errorf("ValidateResponseSubmission(%v) returned unexpected error: %v",
						tt.hasResponded, err)
				}
				return
			}
			if !errors.Is(err, tt.wantErr) {
				t.Errorf("ValidateResponseSubmission(%v) error = %v, want %v",
					tt.hasResponded, err, tt.wantErr)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// T010 – IsPublished
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
