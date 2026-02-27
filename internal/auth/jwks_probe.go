package auth

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"sync/atomic"
	"time"
)

// ProbeJWKS attempts a single HTTP GET to the JWKS endpoint.
// Returns nil if the endpoint responds with HTTP 2xx within 5 seconds.
func ProbeJWKS(ctx context.Context, jwksURL string) error {
	timeoutCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(timeoutCtx, http.MethodGet, jwksURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create JWKS probe request: %w", err)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("JWKS probe failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("JWKS endpoint returned HTTP %d", resp.StatusCode)
	}

	return nil
}

// RetryJWKSProbe retries ProbeJWKS with exponential backoff until success or context cancellation.
// When the probe succeeds, it sets jwksReady to true and returns.
func RetryJWKSProbe(ctx context.Context, jwksURL string, jwksReady *atomic.Bool) {
	retryJWKSProbeWithBackoff(ctx, jwksURL, jwksReady, 5*time.Second)
}

// retryJWKSProbeWithBackoff is the internal implementation that accepts a configurable
// initial backoff duration for testability.
func retryJWKSProbeWithBackoff(ctx context.Context, jwksURL string, jwksReady *atomic.Bool, initialBackoff time.Duration) {
	const maxBackoff = 5 * time.Minute

	backoff := initialBackoff
	for {
		select {
		case <-ctx.Done():
			return
		case <-time.After(backoff):
		}

		if err := ProbeJWKS(ctx, jwksURL); err != nil {
			nextBackoff := backoff * 2
			if nextBackoff > maxBackoff {
				nextBackoff = maxBackoff
			}
			slog.Warn("JWKS endpoint still unreachable",
				"url", jwksURL,
				"error", err,
				"next_retry_seconds", nextBackoff.Seconds(),
			)
			backoff = nextBackoff
		} else {
			slog.Info("JWKS endpoint became reachable", "url", jwksURL)
			jwksReady.Store(true)
			return
		}
	}
}
