import { supabase } from '../../lib/supabase';
import { handleApiError } from './errorHandling';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

/**
 * Get authentication headers for API requests
 * @returns Promise resolving to headers object with auth token if available
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  }

  return headers;
}

/**
 * Make an authenticated API request
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
  options: RequestInit = {}
): Promise<T> {
  // Get auth headers and merge with any provided headers
  const authHeaders = await getAuthHeaders();
  const headers = {
    ...authHeaders,
    ...options.headers,
  };

  // Make the request
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle errors
  if (!response.ok) {
    await handleApiError(response);
  }

  // Return typed JSON response
  return response.json();
}
