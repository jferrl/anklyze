package postgres

import (
	"errors"
	"fmt"
	"testing"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jferrl/anklyze/internal/domain"
)

func TestMapCaseResponseError(t *testing.T) {
	t.Parallel()

	other := errors.New("connection refused")
	tests := []struct {
		name string
		err  error
		want error // nil means the input must come back unchanged
	}{
		{"unique violation on case/user index", &pgconn.PgError{Code: "23505", ConstraintName: caseResponseUniqueIndex}, domain.ErrAlreadyResponded},
		{"wrapped unique violation", fmt.Errorf("exec: %w", &pgconn.PgError{Code: "23505", ConstraintName: caseResponseUniqueIndex}), domain.ErrAlreadyResponded},
		{"unique violation on primary key", &pgconn.PgError{Code: "23505", ConstraintName: "case_responses_pkey"}, nil},
		{"other pg code on the index name", &pgconn.PgError{Code: "23503", ConstraintName: caseResponseUniqueIndex}, nil},
		{"non-pg error", other, nil},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got := mapCaseResponseError(tt.err)
			if tt.want == nil {
				if got != tt.err {
					t.Errorf("mapCaseResponseError() = %v, want input unchanged", got)
				}
				return
			}
			if !errors.Is(got, tt.want) {
				t.Errorf("mapCaseResponseError() = %v, want %v", got, tt.want)
			}
		})
	}
}
