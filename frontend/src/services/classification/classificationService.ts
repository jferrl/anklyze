import type { FractureInput, ClassificationResult } from '@/types';
import { apiRequest } from '../core/apiClient';
import { getCurrentLanguage } from '../../i18n/config';
import i18n from '../../i18n/config';

/**
 * Classify an ankle fracture based on input parameters
 * @param input - Fracture input parameters
 * @returns Promise resolving to classification result
 * @throws {AuthRequiredError} - When authentication is required
 * @throws {ForbiddenError} - When access is forbidden
 * @throws {InputValidationError} - When input validation fails
 */
export async function classifyFracture(input: FractureInput): Promise<ClassificationResult> {
  const lang = getCurrentLanguage();

  try {
    return await apiRequest<ClassificationResult>('/api/classify', {
      method: 'POST',
      headers: {
        'Accept-Language': lang,
      },
      body: JSON.stringify(input),
    });
  } catch (error) {
    // If the error has an error code (new format: code, legacy: error_code), translate it using i18n
    if (error instanceof Error) {
      const apiError = error as Error & { code?: string; error_code?: string };
      const errorCode = apiError.code || apiError.error_code;
      if (errorCode) {
        const t = i18n.t.bind(i18n);
        // Normalize error code to lowercase for i18n lookup
        throw new Error(t(`errors.${errorCode.toLowerCase()}`, apiError.message));
      }
    }
    throw error;
  }
}

/**
 * Validate if a fracture combination is anatomically possible
 * @param input - Partial fracture input to validate
 * @returns Promise resolving to true if valid, false otherwise
 * @throws {AuthRequiredError} - When authentication is required
 * @throws {ForbiddenError} - When access is forbidden
 *
 * Note: This function is a placeholder. The /api/validate endpoint
 * may need to be implemented on the backend.
 */
export async function validateCombination(input: Partial<FractureInput>): Promise<boolean> {
  try {
    const result = await apiRequest<{ valid: boolean }>('/api/validate', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return result.valid;
  } catch (error) {
    // If the endpoint doesn't exist (404), return true (assume valid)
    if (error instanceof Error && error.message.includes('404')) {
      console.warn('Validate endpoint not implemented, assuming valid combination');
      return true;
    }
    throw error;
  }
}
