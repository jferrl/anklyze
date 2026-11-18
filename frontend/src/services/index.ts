// ================================
// Classification Service
// ================================
export * from './classification/classificationService';

// ================================
// Study Services (Cases & Studies)
// ================================
export * from './study';

// ================================
// Core - Error Handling
// ================================
export {
  ForbiddenError,
  InputValidationError,
  handleApiError,
} from './core/errorHandling';

// ================================
// Core - API Configuration
// ================================
export { API_BASE_URL } from './core/apiClient';
