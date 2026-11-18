package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/jferrl/anklyze/internal/config"
)

// unreachableURL returns the URL of a server that has been shut down.
func unreachableURL() string {
	s := httptest.NewServer(http.NotFoundHandler())
	s.Close()
	return s.URL
}

func TestInitAuth(t *testing.T) {
	jwks := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"keys":[]}`))
	}))
	defer jwks.Close()

	tests := []struct {
		name    string
		url     string
		wantErr bool
		wantNil bool
	}{
		{"valid config", jwks.URL, false, false},
		{"empty URL is dev mode", "", false, true},
		{"scheme-less URL fails closed", "supabase.co", true, true},
		{"non-http scheme fails closed", "ftp://example.supabase.co", true, true},
		{"no host fails closed", "https://", true, true},
		// Keys load in the background, so the validator exists and rejects
		// every token until the JWKS is reachable.
		{"unreachable JWKS keeps a validator", unreachableURL(), false, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			v, err := initAuth(context.Background(), &config.Config{SupabaseURL: tt.url})
			if (err != nil) != tt.wantErr {
				t.Fatalf("initAuth() error = %v, wantErr %v", err, tt.wantErr)
			}
			if (v == nil) != tt.wantNil {
				t.Fatalf("initAuth() validator nil = %v, want %v", v == nil, tt.wantNil)
			}
		})
	}
}

func TestInitAuth_UnreachableJWKSRejectsTokens(t *testing.T) {
	v, err := initAuth(context.Background(), &config.Config{SupabaseURL: unreachableURL()})
	if err != nil || v == nil {
		t.Fatalf("initAuth() = %v, %v", v, err)
	}
	if _, err := v.ValidateToken("eyJhbGciOiJFUzI1NiIsImtpZCI6IngifQ.e30.c2ln"); err == nil {
		t.Fatal("ValidateToken accepted a token while no keys are loaded")
	}
}
