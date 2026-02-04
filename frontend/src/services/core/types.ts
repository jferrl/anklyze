/**
 * Common API request/response types
 */

/**
 * Standard API error response structure
 */
export interface ApiErrorResponse {
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
