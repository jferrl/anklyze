import type {
  ChatRequest,
  ChatResponse,
  ChatSessionResponse,
} from '@/types';
import { apiRequest } from '../core/apiClient';
import { getCurrentLanguage } from '../../i18n/config';
import i18n from '../../i18n/config';
import {
  SessionLimitError,
  RateLimitError,
  InputValidationError,
} from '../core/errorHandling';

// Re-export feedback function for convenience
export { submitFeedback } from '../feedback/feedbackService';

/**
 * Send a chat message to the AI assistant
 * @param message - The message text
 * @param sessionId - Optional session ID to continue an existing conversation
 * @returns Promise resolving to chat response
 * @throws {SessionLimitError} - When session limit is exceeded
 * @throws {RateLimitError} - When rate limit is exceeded
 * @throws {InputValidationError} - When message validation fails
 * @throws {AuthRequiredError} - When authentication is required
 */
export async function sendChatMessage(
  message: string,
  sessionId?: string
): Promise<ChatResponse> {
  const lang = getCurrentLanguage();

  const request: ChatRequest = {
    message,
    language: lang,
    session_id: sessionId,
  };

  try {
    return await apiRequest<ChatResponse>('/api/chat', {
      method: 'POST',
      headers: {
        'Accept-Language': lang,
      },
      body: JSON.stringify(request),
    });
  } catch (error) {
    // Handle specific chat errors with i18n translations
    const t = i18n.t.bind(i18n);

    if (error instanceof SessionLimitError) {
      throw new SessionLimitError(t('chat.errors.sessionLimit'));
    }
    if (error instanceof RateLimitError) {
      throw new RateLimitError(t('chat.errors.rateLimit'));
    }
    if (error instanceof InputValidationError) {
      const validationCodes = [
        'input_too_short',
        'repeated_characters',
        'too_many_special_chars',
        'too_few_words',
        'keyboard_smash',
        'no_medical_context',
        'unsupported_language',
        'no_words',
      ];
      if (validationCodes.includes(error.code)) {
        const errorMessage = t(`errors.${error.code}`, 'Invalid input');
        throw new InputValidationError(errorMessage, error.code);
      }
    }

    // Handle service unavailable (503) error
    if (error instanceof Error && error.message.includes('503')) {
      throw new Error(t('errors.chat_unavailable'));
    }

    // Handle other errors with i18n translation if error code is present (new: code, legacy: error_code)
    if (error instanceof Error) {
      const apiError = error as Error & { code?: string; error_code?: string };
      const errorCode = apiError.code || apiError.error_code;
      if (errorCode) {
        // Normalize error code to lowercase for i18n lookup
        throw new Error(t(`errors.${errorCode.toLowerCase()}`, apiError.message));
      }
    }

    throw error;
  }
}

/**
 * Create a new chat session
 * @returns Promise resolving to new session details
 * @throws {AuthRequiredError} - When authentication is required
 */
export async function createChatSession(): Promise<ChatSessionResponse> {
  const lang = getCurrentLanguage();

  try {
    return await apiRequest<ChatSessionResponse>('/api/chat/session', {
      method: 'POST',
      headers: {
        'Accept-Language': lang,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error('Failed to create chat session');
    }
    throw error;
  }
}

/**
 * Mark a chat session as completed
 * @param sessionId - The session ID to complete
 * @throws {AuthRequiredError} - When authentication is required
 */
export async function completeChatSession(sessionId: string): Promise<void> {
  try {
    await apiRequest<void>(`/api/chat/session/${sessionId}/complete`, {
      method: 'PUT',
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error('Failed to complete chat session');
    }
    throw error;
  }
}

/**
 * Mark a chat session as abandoned
 * @param sessionId - The session ID to abandon
 * @throws {AuthRequiredError} - When authentication is required
 */
export async function abandonChatSession(sessionId: string): Promise<void> {
  try {
    await apiRequest<void>(`/api/chat/session/${sessionId}/abandon`, {
      method: 'PUT',
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error('Failed to abandon chat session');
    }
    throw error;
  }
}

