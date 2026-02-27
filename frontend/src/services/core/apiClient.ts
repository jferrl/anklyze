import { supabase } from '../../lib/supabase';
import { handleApiError } from './errorHandling';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const RETRYABLE_METHODS = new Set(['GET', 'PUT', 'DELETE']);
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 300;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get authentication headers for API requests
 * @returns Promise resolving to headers object with auth token if available
 */
export async function getAuthHeaders(accessToken?: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  } else if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  }

  return headers;
}

/**
 * Make an authenticated API request with exponential backoff retry for idempotent methods.
 * GET, PUT, DELETE are retried up to 3 times on 429/5xx responses.
 * POST is never retried automatically.
 * Non-retryable status codes (400, 401, 403, 404) propagate immediately without retry.
 * @param endpoint - API endpoint path (e.g., '/api/classify')
 * @param options - Fetch request options
 * @returns Promise resolving to typed JSON response
 * @throws {AuthRequiredError} - When authentication is required (401)
 * @throws {ForbiddenError} - When access is forbidden (403)
 * @throws {RateLimitError} - When rate limit is exceeded (429)
 * @throws {InputValidationError} - When input validation fails (400)
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const canRetry = RETRYABLE_METHODS.has(method);
  const maxAttempts = canRetry ? MAX_RETRIES + 1 : 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const authHeaders = await getAuthHeaders(accessToken);
    const headers = { ...authHeaders, ...options.headers };
    const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });

    if (response.ok) {
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return undefined as T;
      }
      return response.json();
    }

    const isLastAttempt = attempt === maxAttempts - 1;
    const isRetryableStatus = RETRYABLE_STATUSES.has(response.status);

    if (isLastAttempt || !isRetryableStatus) {
      await handleApiError(response);
    }

    // Exponential backoff with full jitter
    const exp = BASE_DELAY_MS * Math.pow(2, attempt);
    const jitter = Math.random() * exp;
    const delay = Math.min(exp + jitter, 10_000);
    await sleep(delay);
  }

  // Unreachable — handleApiError always throws — but satisfies TypeScript
  throw new Error('Unexpected retry exhaustion');
}
