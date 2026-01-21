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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export async function classifyFracture(input: FractureInput): Promise<ClassificationResult> {
  const lang = getCurrentLanguage();
  const response = await fetch(`${API_BASE_URL}/api/classify?lang=${lang}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': lang,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Classification error');
  }

  return response.json();
}

export async function getFormOptions(): Promise<FormOptions> {
  const lang = getCurrentLanguage();
  const response = await fetch(`${API_BASE_URL}/api/options?lang=${lang}`, {
    headers: {
      'Accept-Language': lang,
    },
  });

  if (!response.ok) {
    throw new Error('Error loading form options');
  }

  return response.json();
}

export async function sendChatMessage(message: string, sessionId?: string): Promise<ChatResponse> {
  const lang = getCurrentLanguage();
  const request: ChatRequest = {
    message,
    language: lang,
    session_id: sessionId,
  };

  const response = await fetch(`${API_BASE_URL}/api/chat?lang=${lang}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': lang,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
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
  const response = await fetch(`${API_BASE_URL}/api/chat/session?lang=${lang}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': lang,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to create chat session');
  }

  return response.json();
}

export async function completeChatSession(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/chat/session/${sessionId}/complete`, {
    method: 'PUT',
  });

  if (!response.ok) {
    throw new Error('Failed to complete chat session');
  }
}

export async function abandonChatSession(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/chat/session/${sessionId}/abandon`, {
    method: 'PUT',
  });

  if (!response.ok) {
    throw new Error('Failed to abandon chat session');
  }
}

export async function submitFeedback(
  sessionId: string,
  feedback: FeedbackRequest
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/chat/session/${sessionId}/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(feedback),
  });

  if (!response.ok) {
    if (response.status === 409) {
      throw new Error('Feedback already submitted');
    }
    const error = await response.json();
    throw new Error(error.error || 'Failed to submit feedback');
  }
}

// Chat analytics
export async function getChatAnalyticsSummary(
  from?: string,
  to?: string
): Promise<ChatAnalyticsSummary> {
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);

  const response = await fetch(`${API_BASE_URL}/api/analytics/chat/summary?${params}`);

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

  const response = await fetch(`${API_BASE_URL}/api/analytics/chat/feedback?${params}`);

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

  const response = await fetch(`${API_BASE_URL}/api/analytics/chat/confidence?${params}`);

  if (!response.ok) {
    throw new Error('Failed to get confidence distribution');
  }

  return response.json();
}
