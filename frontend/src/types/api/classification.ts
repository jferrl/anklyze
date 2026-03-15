import type {
  FractureInput,
  ClassificationResult,
} from '../domain/fracture';

/**
 * Request payload for classification endpoint
 * Extends the core fracture input with optional language specification
 */
export interface ClassifyFractureRequest extends FractureInput {
  /** Language for classification response (defaults to browser language) */
  language?: 'en' | 'es';
}

/**
 * Type alias for the current API implementation
 * The API currently returns ClassificationResult directly
 * This can be removed once the API is updated to return the full response structure
 */
export type ClassifyFractureApiResponse = ClassificationResult;
