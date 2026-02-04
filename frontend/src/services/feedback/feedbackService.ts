import type { FeedbackRequest } from '@/types';
import { apiRequest } from '../core/apiClient';

/**
 * Submit feedback for a chat session
 * @param sessionId - The session ID to submit feedback for
 * @param feedback - The feedback data (rating, comments, etc.)
 * @returns Promise that resolves when feedback is submitted
 * @throws {AuthRequiredError} - When authentication is required
 * @throws {Error} - When feedback was already submitted (409 conflict)
 * @throws {Error} - When submission fails for other reasons
 */
export async function submitFeedback(
  sessionId: string,
  feedback: FeedbackRequest
): Promise<void> {
  try {
    await apiRequest<void>(`/api/chat/session/${sessionId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(feedback),
    });
  } catch (error) {
    if (error instanceof Error) {
      // Handle conflict error (feedback already submitted)
      if (error.message.includes('409')) {
        throw new Error('Feedback already submitted');
      }

      // Try to extract error message from API response
      const apiError = error as Error & { error?: string };
      throw new Error(apiError.error || 'Failed to submit feedback');
    }
    throw error;
  }
}
