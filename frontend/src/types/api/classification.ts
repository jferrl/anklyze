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
 * Response from classification endpoint
 * Contains the classification result along with metadata
 */
export interface ClassifyFractureResponse {
  /** The classification result with all classification systems */
  classification: ClassificationResult;

  /** Confidence score for the classification (0-1) */
  confidence?: number;

  /** Reasoning or explanation for the classification */
  reasoning?: string;

  /** Any warnings or notes about the classification */
  warnings?: string[];

  /** Timestamp when the classification was performed */
  timestamp?: string;
}

/**
 * Request payload for combination validation endpoint
 * Contains a subset of fracture characteristics to validate
 */
export interface ValidateCombinationRequest {
  /** Which malleoli are fractured */
  involved_malleoli?: FractureInput['involved_malleoli'];

  /** Fibular fracture level */
  fibular_level?: FractureInput['fibular_level'];

  /** Lateral fracture morphology */
  lateral_morphology?: FractureInput['lateral_morphology'];

  /** Medial fracture morphology */
  medial_morphology?: FractureInput['medial_morphology'];

  /** Posterior fracture type (Bartonicek) */
  posterior_fracture_type?: FractureInput['posterior_fracture_type'];

  /** Whether CT scan is available */
  has_ct_scan?: FractureInput['has_ct_scan'];
}

/**
 * Response from combination validation endpoint
 */
export interface ValidateCombinationResponse {
  /** Whether the fracture combination is anatomically valid */
  valid: boolean;

  /** Reason why the combination is invalid (if applicable) */
  reason?: string;

  /** Specific error code for the validation failure */
  error_code?: string;
}

/**
 * Type alias for the current API implementation
 * The API currently returns ClassificationResult directly
 * This can be removed once the API is updated to return the full response structure
 */
export type ClassifyFractureApiResponse = ClassificationResult;
