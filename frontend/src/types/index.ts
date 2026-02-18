/**
 * Central barrel export for all application types
 * Organized by concern: Domain, API, and UI
 */

// ============================================================================
// Domain Exports
// Pure domain types representing the core business entities and concepts
// ============================================================================

/**
 * Fracture classification domain types
 * - Classification systems (Danis-Weber, Lauge-Hansen, AO/OTA, Bartonicek)
 * - Fracture characteristics and inputs
 * - Classification results
 */
export * from './domain/fracture';

/**
 * Case domain types
 * - Case management entities
 * - User responses and classifications
 * - Reliability and analytics metrics
 * - User profiles
 */
export * from './domain/case';

/**
 * Study domain types
 * - Research studies grouping multiple cases
 * - Study raters and progress tracking
 * - Multi-case reliability metrics (Fleiss' Kappa)
 */
export * from './domain/study';

// ============================================================================
// API Exports
// Request and response types for backend API communication
// ============================================================================

/**
 * Classification API types
 * - Classification requests and responses
 * - Combination validation
 */
export * from './api/classification';

/**
 * Chat API types
 * - Conversational classification interface
 * - Chat sessions and messages
 * - Clarifications and completions
 */
export * from './api/chat';

/**
 * Analytics API types
 * - Usage metrics and summaries
 * - Feedback collection
 * - Confidence distributions
 */
export * from './api/analytics';

/**
 * Study/Case API types
 * - Case and study CRUD operations
 * - Response submissions
 * - User access management
 * - Reliability calculations
 */
export * from './api/study';

// ============================================================================
// UI Exports
// User interface and form-related types
// ============================================================================

/**
 * Form types
 * - Form options and questions
 * - Form state management
 * - Field configurations
 */
export * from './ui/forms';

