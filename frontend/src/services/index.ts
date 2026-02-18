// ================================
// Classification Service
// ================================
export * from './classification/classificationService';

// ================================
// Chat Service
// ================================
export * from './chat/chatService';

// ================================
// Feedback Service
// ================================
export * from './feedback/feedbackService';

// ================================
// Study Services (Cases & Studies)
// ================================
export * from './study';

// ================================
// Core - Error Handling
// ================================
export {
  RateLimitError,
  SessionLimitError,
  InputValidationError,
  AuthRequiredError,
  ForbiddenError,
  handleApiError,
} from './core/errorHandling';

// ================================
// Core - API Configuration
// ================================
export { API_BASE_URL } from './core/apiClient';
