// Custom error for rate limiting
export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
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
  code: string;
  constructor(message: string = 'Access denied', code: string = '') {
    super(message);
    this.name = 'ForbiddenError';
    this.code = code;
  }
}

/**
 * Extract error code from response, handling both new and legacy formats
 * New format: { code: "INVALID_INPUT", message: "..." }
 * Legacy format: { error_code: "invalid_input", error: "..." }
 */
function getErrorCode(error: Record<string, unknown>): string {
  return (error.code as string) || (error.error_code as string) || '';
}

/**
 * Extract error message from response, handling both new and legacy formats
 */
function getErrorMessage(error: Record<string, unknown>, fallback: string): string {
  return (error.message as string) || (error.error as string) || fallback;
}

/**
 * Handle API errors and throw appropriate error types based on status code
 * Supports both new unified format (code/message) and legacy format (error_code/error)
 * @param response - The Response object from the API call
 * @throws {AuthRequiredError} - When status is 401
 * @throws {ForbiddenError} - When status is 403
 * @throws {RateLimitError} - When status is 429
 * @throws {InputValidationError} - When status is 400 and error code indicates invalid input
 */
export async function handleApiError(response: Response): Promise<never> {
  // Handle authentication errors
  if (response.status === 401) {
    throw new AuthRequiredError();
  }

  // Handle forbidden errors (preserves code for DEADLINE_PASSED, CASE_NOT_ACCEPTING_RESPONSES)
  if (response.status === 403) {
    const error = await response.json();
    const errorCode = getErrorCode(error);
    throw new ForbiddenError(getErrorMessage(error, 'Access denied'), errorCode);
  }

  // Handle rate limiting errors
  if (response.status === 429) {
    const error = await response.json();
    throw new RateLimitError(getErrorMessage(error, 'Rate limit exceeded'));
  }

  // Handle input validation errors
  if (response.status === 400) {
    const error = await response.json();
    const errorCode = getErrorCode(error);

    if (errorCode.toUpperCase() === 'INVALID_INPUT' || errorCode.startsWith('INVALID_') || errorCode === 'invalid_input') {
      throw new InputValidationError(getErrorMessage(error, 'Invalid input'), errorCode);
    }

    const err = new Error(getErrorMessage(error, 'Bad request'));
    (err as Error & { code?: string }).code = errorCode;
    throw err;
  }

  // For other errors, throw a generic error with code preserved
  const error = await response.json();
  const errorCode = getErrorCode(error);
  const err = new Error(getErrorMessage(error, 'An error occurred'));
  // Preserve code for i18n translation in service layers (support both formats)
  (err as Error & { code?: string; error_code?: string }).code = errorCode;
  (err as Error & { code?: string; error_code?: string }).error_code = errorCode;
  throw err;
}
