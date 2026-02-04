import type {
  FractureInput,
  ClassificationResult,
} from '../domain/fracture';

/**
 * Chat session status
 */
export type ChatStatus = 'complete' | 'needs_clarification' | 'error';

/**
 * Clarification needed from user
 * Used when the chat AI needs additional information
 */
export interface Clarification {
  /** Field that needs clarification */
  field: string;

  /** Question to ask the user */
  question: string;

  /** Optional suggested options for the answer */
  options?: string[];
}

/**
 * Request payload for chat message
 */
export interface ChatRequest {
  /** User's natural language message */
  message: string;

  /** Language for the conversation */
  language: string;

  /** Optional session ID for continuing a conversation */
  session_id?: string;
}

/**
 * Response from chat endpoint
 * Contains classification result or clarification requests
 */
export interface ChatResponse {
  /** Status of the chat interaction */
  status: ChatStatus;

  /** Extracted fracture input from conversation (if complete) */
  extracted_input?: FractureInput;

  /** Classification result (if extraction is complete) */
  classification?: ClassificationResult;

  /** Confidence score for the extraction/classification (0-1) */
  confidence: number;

  /** Fields that are still missing */
  missing_fields?: string[];

  /** Clarifications needed from the user */
  clarifications?: Clarification[];

  /** Message to display to the user */
  message: string;
}

/**
 * Response when creating a new chat session
 */
export interface ChatSessionResponse {
  /** Unique session identifier */
  session_id: string;
}
