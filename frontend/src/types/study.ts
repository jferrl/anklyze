/**
 * Temporary re-export file for backward compatibility
 *
 * This file re-exports types from the new organized structure.
 * All imports from './types/study' will continue to work during migration.
 *
 * After all imports are updated to use the new structure, this file can be removed.
 *
 * New import locations:
 * - Case domain types: './types/domain/case'
 * - Study domain types: './types/domain/study'
 * - Study/Case API types: './types/api/study'
 *
 * @deprecated Import from specific modules instead
 */

// Domain types - Case management
export * from './domain/case';

// Domain types - Study (research projects)
export * from './domain/study';

// API types - Study and Case operations
export * from './api/study';

// ============================================================================
// Backwards Compatibility Type Aliases
// These map old naming conventions to new types for gradual migration
// ============================================================================

import type {
  Case,
  CaseStatus,
  CaseImage,
  CaseImageInfo,
  CaseWithImages,
  UserCaseItem,
  UserCaseDetail,
  CaseResponse,
  CaseUser,
  CaseAnalyticsSummary,
  AdminCaseImage,
} from './domain/case';

import type {
  CreateCaseRequest,
  UpdateCaseRequest,
  AddCaseUserRequest,
  CaseListResponse,
  UserCaseListResponse,
  CaseResponseListResponse,
  CaseUsersListResponse,
  CreateStudyRequest,
  UpdateStudyRequest,
  AddStudyRaterRequest,
  StudyListResponse,
  StudyReliabilityResponse,
} from './api/study';

import type {
  Study,
  StudyStatus,
  StudyWithCases,
  StudyRater,
  StudyGoldStandardAccuracy,
  StudyReliabilityMetrics,
} from './domain/study';

// Old "Study" types now map to Case (when we renamed Study → Case)
/** @deprecated Use Case instead */
export type StudyOld = Case;
/** @deprecated Use CaseStatus instead */
export type StudyStatusOld = CaseStatus;
/** @deprecated Use CaseImage instead */
export type StudyImage = CaseImage;
/** @deprecated Use CaseImageInfo instead */
export type StudyImageInfo = CaseImageInfo;
/** @deprecated Use CaseWithImages instead */
export type StudyWithImages = CaseWithImages;
/** @deprecated Use UserCaseItem instead */
export type UserStudyItem = UserCaseItem;
/** @deprecated Use UserCaseDetail instead */
export type UserStudyDetail = UserCaseDetail;
/** @deprecated Use CaseResponse instead */
export type StudyResponse = CaseResponse;
/** @deprecated Use CaseUser instead */
export type StudyUser = CaseUser;
/** @deprecated Use CaseUsersListResponse instead */
export type StudyUsersListResponse = CaseUsersListResponse;
/** @deprecated Use AddCaseUserRequest instead */
export type AddStudyUserRequest = AddCaseUserRequest;
/** @deprecated Use CreateCaseRequest instead */
export type CreateStudyRequestOld = CreateCaseRequest;
/** @deprecated Use UpdateCaseRequest instead */
export type UpdateStudyRequestOld = UpdateCaseRequest;
/** @deprecated Use CaseListResponse instead */
export type StudyListResponseOld = CaseListResponse;
/** @deprecated Use UserCaseListResponse instead */
export type UserStudyListResponse = UserCaseListResponse;
/** @deprecated Use CaseResponseListResponse instead */
export type StudyResponseListResponse = CaseResponseListResponse;
/** @deprecated Use CaseAnalyticsSummary instead */
export type StudyAnalyticsSummary = CaseAnalyticsSummary;
/** @deprecated Use AdminCaseImage instead */
export type AdminStudyImage = AdminCaseImage;

// Old "Cohort" types now map to Study (when we renamed Cohort → Study)
/** @deprecated Use StudyStatus instead */
export type CohortStatus = StudyStatus;
/** @deprecated Use Study instead */
export type StudyCohort = Study;
/** @deprecated Use StudyWithCases instead */
export type CohortWithCases = StudyWithCases;
/** @deprecated Use StudyRater instead */
export type CohortUser = StudyRater;
/** @deprecated Use CreateStudyRequest instead */
export type CreateCohortRequest = CreateStudyRequest;
/** @deprecated Use UpdateStudyRequest instead */
export type UpdateCohortRequest = UpdateStudyRequest;
/** @deprecated Use AddStudyRaterRequest instead */
export type AddCohortUserRequest = AddStudyRaterRequest;
/** @deprecated Use StudyListResponse instead */
export type CohortListResponse = StudyListResponse;
/** @deprecated Use StudyGoldStandardAccuracy instead */
export type CohortGoldStandardAccuracy = StudyGoldStandardAccuracy;
/** @deprecated Use StudyReliabilityMetrics instead */
export type CohortReliabilityMetrics = StudyReliabilityMetrics;
/** @deprecated Use StudyReliabilityResponse instead */
export type CohortReliabilityResponse = StudyReliabilityResponse;
