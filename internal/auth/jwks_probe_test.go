package auth

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func TestProbeJWKS_Success(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	err := ProbeJWKS(context.Background(), server.URL)
	if err != nil {
		t.Errorf("ProbeJWKS() with 200 response: got error %v, want nil", err)
	}
}

func TestProbeJWKS_ServerError(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	err := ProbeJWKS(context.Background(), server.URL)
	if err == nil {
		t.Error("ProbeJWKS() with 500 response: got nil error, want non-nil")
	}
	if !strings.Contains(err.Error(), "HTTP 500") {
		t.Errorf("ProbeJWKS() with 500 response: error %q does not contain 'HTTP 500'", err.Error())
	}
}

func TestProbeJWKS_Unreachable(t *testing.T) {
	t.Parallel()

	// Port 1 is unlikely to be in use and should be immediately refused
	err := ProbeJWKS(context.Background(), "http://127.0.0.1:1")
	if err == nil {
		t.Error("ProbeJWKS() with unreachable URL: got nil error, want non-nil")
	}
}

func TestProbeJWKS_CancelledContext(t *testing.T) {
	t.Parallel()

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // cancel immediately

	err := ProbeJWKS(ctx, "http://127.0.0.1:1")
	if err == nil {
		t.Error("ProbeJWKS() with cancelled context: got nil error, want non-nil")
	}
}

func TestRetryJWKSProbe_SetsAtomicOnSuccess(t *testing.T) {
	t.Parallel()

	// Server that fails twice then succeeds
	callCount := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		callCount++
		if callCount <= 2 {
			w.WriteHeader(http.StatusServiceUnavailable)
		} else {
			w.WriteHeader(http.StatusOK)
		}
	}))
	defer server.Close()

	var jwksReady atomic.Bool
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Use a very short initial backoff (1ms) so the test doesn't wait 5 seconds
	retryJWKSProbeWithBackoff(ctx, server.URL, &jwksReady, 1*time.Millisecond)

	if !jwksReady.Load() {
		t.Error("RetryJWKSProbe() did not set jwksReady to true after successful probe")
	}
}

func TestRetryJWKSProbe_ExitsOnContextCancellation(t *testing.T) {
	t.Parallel()

	// Server always fails
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	var jwksReady atomic.Bool
	ctx, cancel := context.WithCancel(context.Background())

	done := make(chan struct{})
	go func() {
		defer close(done)
		retryJWKSProbeWithBackoff(ctx, server.URL, &jwksReady, 1*time.Millisecond)
	}()

	// Cancel the context after a short time
	time.Sleep(10 * time.Millisecond)
	cancel()

	select {
	case <-done:
		// RetryJWKSProbe exited cleanly — correct behaviour
	case <-time.After(2 * time.Second):
		t.Error("RetryJWKSProbe() did not exit after context cancellation within 2 seconds")
	}

	if jwksReady.Load() {
		t.Error("jwksReady should remain false when context was cancelled before success")
	}
}
