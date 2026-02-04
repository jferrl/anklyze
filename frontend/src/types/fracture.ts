/**
 * Temporary re-export file for backward compatibility
 *
 * This file re-exports types from the new organized structure.
 * All imports from './types/fracture' will continue to work during migration.
 *
 * After all imports are updated to use the new structure, this file can be removed.
 *
 * New import locations:
 * - Domain types: './types/domain/fracture'
 * - Classification API: './types/api/classification'
 * - Chat API: './types/api/chat'
 * - Analytics API: './types/api/analytics'
 * - Form types: './types/ui/forms'
 *
 * @deprecated Import from specific modules instead
 */

// Domain types - Core fracture classification types
export * from './domain/fracture';

// API types - Classification service
export * from './api/classification';

// API types - Chat service
export * from './api/chat';

// API types - Analytics service
export * from './api/analytics';

// UI types - Form options and questions
export * from './ui/forms';
