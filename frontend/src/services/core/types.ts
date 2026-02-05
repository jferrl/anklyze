/**
 * Common API request/response types
 */

/**
 * Standard API error response structure (new unified format)
 */
export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: string; // Only included in debug mode
}

/**
 * Legacy API error response structure (for backwards compatibility)
 * @deprecated Use ApiErrorResponse instead
 */
export interface LegacyApiErrorResponse {
  error: string;
  error_code?: string;
  details?: Record<string, unknown>;
}

/**
 * Generic API response wrapper for paginated results
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}

/**
 * User profile response
 */
export interface UserProfileResponse {
  id: string;
  email: string;
  role: 'user' | 'admin';
  display_name?: string;
  avatar_url?: string;
  provider?: string;
}
