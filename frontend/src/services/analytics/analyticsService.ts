import type {
  ChatAnalyticsSummary,
  ChatFeedbackSummary,
  ConfidenceDistribution,
} from '@/types';
import { apiRequest } from '../core/apiClient';

/**
 * Query parameters for analytics endpoints
 */
interface AnalyticsQueryParams {
  from?: string;
  to?: string;
}

/**
 * Build query string from parameters
 * @param params - Query parameters object
 * @returns Query string (empty if no params)
 */
function buildQueryString(params: AnalyticsQueryParams): string {
  const searchParams = new URLSearchParams();

  if (params.from) {
    searchParams.append('from', params.from);
  }
  if (params.to) {
    searchParams.append('to', params.to);
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Get chat analytics summary (admin only)
 * @param from - Optional start date (ISO format)
 * @param to - Optional end date (ISO format)
 * @returns Promise resolving to chat analytics summary
 * @throws {AuthRequiredError} - When authentication is required
 * @throws {ForbiddenError} - When user doesn't have admin access
 */
export async function getChatAnalyticsSummary(
  from?: string,
  to?: string
): Promise<ChatAnalyticsSummary> {
  const queryString = buildQueryString({ from, to });

  try {
    return await apiRequest<ChatAnalyticsSummary>(
      `/api/analytics/chat/summary${queryString}`,
      {
        method: 'GET',
      }
    );
  } catch (error) {
    if (error instanceof Error) {
      throw new Error('Failed to get chat analytics');
    }
    throw error;
  }
}

/**
 * Get chat feedback summary (admin only)
 * @param from - Optional start date (ISO format)
 * @param to - Optional end date (ISO format)
 * @returns Promise resolving to feedback summary
 * @throws {AuthRequiredError} - When authentication is required
 * @throws {ForbiddenError} - When user doesn't have admin access
 */
export async function getChatFeedbackSummary(
  from?: string,
  to?: string
): Promise<ChatFeedbackSummary> {
  const queryString = buildQueryString({ from, to });

  try {
    return await apiRequest<ChatFeedbackSummary>(
      `/api/analytics/chat/feedback${queryString}`,
      {
        method: 'GET',
      }
    );
  } catch (error) {
    if (error instanceof Error) {
      throw new Error('Failed to get feedback summary');
    }
    throw error;
  }
}

/**
 * Get chat confidence distribution (admin only)
 * @param from - Optional start date (ISO format)
 * @param to - Optional end date (ISO format)
 * @returns Promise resolving to confidence distribution data
 * @throws {AuthRequiredError} - When authentication is required
 * @throws {ForbiddenError} - When user doesn't have admin access
 */
export async function getChatConfidenceDistribution(
  from?: string,
  to?: string
): Promise<ConfidenceDistribution> {
  const queryString = buildQueryString({ from, to });

  try {
    return await apiRequest<ConfidenceDistribution>(
      `/api/analytics/chat/confidence${queryString}`,
      {
        method: 'GET',
      }
    );
  } catch (error) {
    if (error instanceof Error) {
      throw new Error('Failed to get confidence distribution');
    }
    throw error;
  }
}
