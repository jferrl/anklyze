package main

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/jferrl/anklyze/internal/auth"
	"github.com/jferrl/anklyze/internal/config"
)

// initAuth builds the JWT validator. A nil validator means dev mode, which
// only an empty SUPABASE_URL selects; a configured but unusable URL is an
// error so the server never falls back to open routes.
func initAuth(ctx context.Context, cfg *config.Config) (*auth.Validator, error) {
	if !cfg.HasSupabase() {
		slog.Warn("SUPABASE_URL is empty: authentication is DISABLED and all routes are public (dev mode only)")
		return nil, nil
	}
	validator, err := auth.NewValidator(ctx, cfg.SupabaseURL)
	if err != nil {
		return nil, fmt.Errorf("invalid SUPABASE_URL %q: %w", cfg.SupabaseURL, err)
	}
	slog.Info("Supabase authentication enabled", "url", cfg.SupabaseURL)
	return validator, nil
}
