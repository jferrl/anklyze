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
        throw new Error(t(`errors.${errorCode.toLowerCase()}`, apiError.message), { cause: error });
      }
    }
    throw error;
  }
}
