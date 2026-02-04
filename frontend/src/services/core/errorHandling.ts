// Custom error for rate limiting
export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

// Custom error for session limit exceeded
export class SessionLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionLimitError';
  }
}

// Custom error for daily quota exceeded
export class DailyQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DailyQuotaError';
  }
}

// Custom error for input validation failures
export class InputValidationError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'InputValidationError';
    this.code = code;
  }
}

// Custom error for authentication required
export class AuthRequiredError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthRequiredError';
  }
}

// Custom error for forbidden access
export class ForbiddenError extends Error {
  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Handle API errors and throw appropriate error types based on status code
 * @param response - The Response object from the API call
 * @throws {AuthRequiredError} - When status is 401
 * @throws {ForbiddenError} - When status is 403
 * @throws {RateLimitError} - When status is 429
 * @throws {SessionLimitError} - When status is 429 and error_code is session_limit_exceeded
 * @throws {DailyQuotaError} - When status is 429 and error_code is daily_quota_exceeded
 * @throws {InputValidationError} - When status is 400 and error_code starts with INVALID_
 */
export async function handleApiError(response: Response): Promise<never> {
  // Handle authentication errors
  if (response.status === 401) {
    throw new AuthRequiredError();
  }

  // Handle forbidden errors
  if (response.status === 403) {
    throw new ForbiddenError();
  }

  // Handle rate limiting errors
  if (response.status === 429) {
    const error = await response.json();
    const errorCode = error.error_code;

    if (errorCode === 'session_limit_exceeded') {
      throw new SessionLimitError(error.error || 'Session limit exceeded');
    }
    if (errorCode === 'daily_quota_exceeded') {
      throw new DailyQuotaError(error.error || 'Daily quota exceeded');
    }
    throw new RateLimitError(error.error || 'Rate limit exceeded');
  }

  // Handle input validation errors
  if (response.status === 400) {
    const error = await response.json();
    const errorCode = error.error_code || '';

    if (errorCode.startsWith('INVALID_')) {
      throw new InputValidationError(error.error || 'Invalid input', errorCode);
    }
  }

  // For other errors, throw a generic error with error_code preserved
  const error = await response.json();
  const err = new Error(error.error || 'An error occurred');
  // Preserve error_code for i18n translation in service layers
  (err as Error & { error_code?: string }).error_code = error.error_code;
  throw err;
}
