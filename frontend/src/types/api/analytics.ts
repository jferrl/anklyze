/**
 * Time period for analytics queries
 */
export interface TimePeriod {
  /** Start date (ISO 8601 format) */
  from: string;

  /** End date (ISO 8601 format) */
  to: string;
}

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

/**
 * Chat analytics summary
 * Aggregated metrics about chat session usage and performance
 */
export interface ChatAnalyticsSummary {
  /** Time period for this summary */
  period: TimePeriod;

  /** Total number of chat sessions */
  total_sessions: number;

  /** Number of sessions that reached completion */
  completed_sessions: number;

  /** Number of sessions that were abandoned */
  abandoned_sessions: number;

  /** Completion rate (0-1) */
  completion_rate: number;

  /** Average messages per session */
  avg_messages_per_session: number;

  /** Average clarifications needed per session */
  avg_clarifications_per_session: number;

  /** Average confidence score across sessions (0-1) */
  avg_confidence: number;

  /** Average session duration in milliseconds */
  avg_session_duration_ms: number;

  /** Distribution of sessions by language */
  language_distribution: Record<string, number>;

  /** Distribution of classifications by type */
  classification_distribution: Record<string, number>;
}

/**
 * Chat feedback summary
 * Aggregated feedback metrics for chat interactions
 */
export interface ChatFeedbackSummary {
  /** Time period for this summary */
  period: TimePeriod;

  /** Total number of feedback submissions */
  total_feedback: number;

  /** Number of positive ratings */
  positive_count: number;

  /** Number of negative ratings */
  negative_count: number;

  /** Positive rating rate (0-1) */
  positive_rate: number;

  /** Number of feedback submissions with comments */
  feedback_with_comment: number;
}

/**
 * Confidence bucket for distribution analysis
 */
export interface ConfidenceBucket {
  /** Confidence range label (e.g., "0.8-0.9") */
  range: string;

  /** Number of items in this bucket */
  count: number;

  /** Percentage of total (0-100) */
  percentage: number;
}

/**
 * Confidence distribution analysis
 * Shows how confidence scores are distributed across ranges
 */
export interface ConfidenceDistribution {
  /** Time period for this analysis */
  period: TimePeriod;

  /** Total number of items analyzed */
  total: number;

  /** Distribution buckets ordered by confidence range */
  distribution: ConfidenceBucket[];
}
