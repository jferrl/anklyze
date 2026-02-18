/**
 * Feedback rating type
 */
export type FeedbackRating = 'positive' | 'negative';

/**
 * Request payload for submitting feedback
 */
export interface FeedbackRequest {
  /** Rating (positive or negative) */
  rating: FeedbackRating;

  /** Optional comment with additional context */
  comment?: string;
}
