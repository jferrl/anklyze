import type {
  FractureInput,
  ClassificationResult,
  FormOptions,
  ChatRequest,
  ChatResponse,
  ChatSessionResponse,
  FeedbackRequest,
  ChatAnalyticsSummary,
  ChatFeedbackSummary,
  ConfidenceDistribution,
} from '../types/fracture';
import { getCurrentLanguage } from '../i18n/config';
import { supabase } from '../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Custom error for rate limiting
export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

// Custom error for session limit exceeded
export class SessionLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionLimitError';
  }
}

// Custom error for daily quota exceeded
export class DailyQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DailyQuotaError';
  }
}

// Custom error for input validation failures
export class InputValidationError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'InputValidationError';
    this.code = code;
  }
}

// Custom error for authentication required
export class AuthRequiredError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthRequiredError';
  }
}

// Custom error for forbidden access
export class ForbiddenError extends Error {
  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

// Helper to get auth headers
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  }

  return headers;
}

// Helper to handle auth errors
function handleAuthError(status: number): void {
  if (status === 401) {
    throw new AuthRequiredError();
  }
  if (status === 403) {
    throw new ForbiddenError();
  }
}

export async function classifyFracture(input: FractureInput): Promise<ClassificationResult> {
  const lang = getCurrentLanguage();
  const headers = await getAuthHeaders();
  headers['Accept-Language'] = lang;

  const response = await fetch(`${API_BASE_URL}/api/classify?lang=${lang}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });

  handleAuthError(response.status);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Classification error');
  }

  return response.json();
}

export async function getFormOptions(): Promise<FormOptions> {
  const lang = getCurrentLanguage();
  const headers = await getAuthHeaders();
  headers['Accept-Language'] = lang;

  const response = await fetch(`${API_BASE_URL}/api/options?lang=${lang}`, {
    headers,
  });

  handleAuthError(response.status);

  if (!response.ok) {
    throw new Error('Error loading form options');
  }

  return response.json();
}

export async function sendChatMessage(message: string, sessionId?: string): Promise<ChatResponse> {
  const lang = getCurrentLanguage();
  const headers = await getAuthHeaders();
  headers['Accept-Language'] = lang;

  const request: ChatRequest = {
    message,
    language: lang,
    session_id: sessionId,
  };

  const response = await fetch(`${API_BASE_URL}/api/chat?lang=${lang}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  handleAuthError(response.status);

  if (!response.ok) {
    if (response.status === 429) {
      const error = await response.json();
      // Check specific error types
      if (error.error === 'session_limit_exceeded') {
        throw new SessionLimitError('Session limit exceeded');
      }
      if (error.error === 'daily quota exceeded') {
        throw new DailyQuotaError('Daily quota exceeded');
      }
      throw new RateLimitError('Rate limit exceeded');
    }
    if (response.status === 400) {
      const error = await response.json();
      // Check for input validation errors
      const validationCodes = [
        'input_too_short', 'repeated_characters', 'too_many_special_chars',
        'too_few_words', 'keyboard_smash', 'no_medical_context',
        'unsupported_language', 'no_words'
      ];
      if (validationCodes.includes(error.error)) {
        throw new InputValidationError(error.message || 'Invalid input', error.error);
      }
      throw new Error(error.error || 'Invalid input');
    }
    if (response.status === 503) {
      throw new Error('Chat classification is temporarily unavailable');
    }
    const error = await response.json();
    throw new Error(error.error || 'Chat error');
  }

  return response.json();
}

// Chat session management
export async function createChatSession(): Promise<ChatSessionResponse> {
  const lang = getCurrentLanguage();
  const headers = await getAuthHeaders();
  headers['Accept-Language'] = lang;

  const response = await fetch(`${API_BASE_URL}/api/chat/session?lang=${lang}`, {
    method: 'POST',
    headers,
  });

  handleAuthError(response.status);

  if (!response.ok) {
    throw new Error('Failed to create chat session');
  }

  return response.json();
}

export async function completeChatSession(sessionId: string): Promise<void> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}/api/chat/session/${sessionId}/complete`, {
    method: 'PUT',
    headers,
  });

  handleAuthError(response.status);

  if (!response.ok) {
    throw new Error('Failed to complete chat session');
  }
}

export async function abandonChatSession(sessionId: string): Promise<void> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}/api/chat/session/${sessionId}/abandon`, {
    method: 'PUT',
    headers,
  });

  handleAuthError(response.status);

  if (!response.ok) {
    throw new Error('Failed to abandon chat session');
  }
}

export async function submitFeedback(
  sessionId: string,
  feedback: FeedbackRequest
): Promise<void> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}/api/chat/session/${sessionId}/feedback`, {
    method: 'POST',
    headers,
    body: JSON.stringify(feedback),
  });

  handleAuthError(response.status);

  if (!response.ok) {
    if (response.status === 409) {
      throw new Error('Feedback already submitted');
    }
    const error = await response.json();
    throw new Error(error.error || 'Failed to submit feedback');
  }
}

// Chat analytics (admin only)
export async function getChatAnalyticsSummary(
  from?: string,
  to?: string
): Promise<ChatAnalyticsSummary> {
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);

  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}/api/analytics/chat/summary?${params}`, {
    headers,
  });

  handleAuthError(response.status);

  if (!response.ok) {
    throw new Error('Failed to get chat analytics');
  }

  return response.json();
}

export async function getChatFeedbackSummary(
  from?: string,
  to?: string
): Promise<ChatFeedbackSummary> {
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);

  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}/api/analytics/chat/feedback?${params}`, {
    headers,
  });

  handleAuthError(response.status);

  if (!response.ok) {
    throw new Error('Failed to get feedback summary');
  }

  return response.json();
}

export async function getChatConfidenceDistribution(
  from?: string,
  to?: string
): Promise<ConfidenceDistribution> {
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);

  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}/api/analytics/chat/confidence?${params}`, {
    headers,
  });

  handleAuthError(response.status);

  if (!response.ok) {
    throw new Error('Failed to get confidence distribution');
  }

  return response.json();
}
