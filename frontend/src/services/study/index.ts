// Re-export types
export type { UserProfileResponse } from './caseService';

// Re-export all case-related functions
export {
  // User case endpoints
  listPublishedCases,
  getPublishedCase,
  getImageSignedURL,
  getAdminImageSignedURL,
  submitCaseResponse,
  getMyResponses,
  // Admin case endpoints
  createCase,
  listCases,
  getCase,
  updateCase,
  deleteCase,
  uploadCaseImage,
  getAdminCaseImages,
  deleteCaseImage,
  updateCaseImage,
  publishCase,
  closeCase,
  getCaseAnalytics,
  listCaseResponses,
  exportCaseResponses,
  downloadCaseResponsesCSV,
  getReliabilityMetrics,
  getDivergenceAnalysis,
  exportDetailedResponses,
  downloadDetailedResponsesCSV,
  // User profile endpoints
  getCurrentUser,
  getUserProfile,
  updateUserProfile,
  // Case user management
  listCaseUsers,
  addCaseUser,
  removeCaseUser,
  // Helper functions
  getImageUrl,
  getAdminImageUrl,
} from './caseService';

// Re-export all study-related functions
export {
  // Study management
  createStudy,
  listStudies,
  getStudy,
  updateStudy,
  deleteStudy,
  activateStudy,
  closeStudy,
  // Study cases
  addCaseToStudy,
  removeCaseFromStudy,
  reorderStudyCases,
  // Study raters
  listStudyRaters,
  addStudyRater,
  removeStudyRater,
  // Study analytics
  getStudyRaterProgress,
  getStudyReliabilityMetrics,
  exportStudyResponses,
  downloadStudyResponsesCSV,
} from './studyService';

// Import for creating namespaced exports
import * as caseService from './caseService';
import * as studyService from './studyService';

// ================================
// Backwards Compatibility Aliases
// ================================

/** @deprecated Use listPublishedCases instead */
export const listPublishedStudies = caseService.listPublishedCases;
/** @deprecated Use getPublishedCase instead */
export const getPublishedStudy = caseService.getPublishedCase;
/** @deprecated Use submitCaseResponse instead */
export const submitStudyResponse = caseService.submitCaseResponse;
/** @deprecated Use createCase instead */
export const createStudyOld = caseService.createCase;
/** @deprecated Use listCases instead */
export const listStudiesOld = caseService.listCases;
/** @deprecated Use getCase instead */
export const getStudyOld = caseService.getCase;
/** @deprecated Use updateCase instead */
export const updateStudyOld = caseService.updateCase;
/** @deprecated Use deleteCase instead */
export const deleteStudyOld = caseService.deleteCase;
/** @deprecated Use uploadCaseImage instead */
export const uploadStudyImage = caseService.uploadCaseImage;
/** @deprecated Use getAdminCaseImages instead */
export const getAdminStudyImages = caseService.getAdminCaseImages;
/** @deprecated Use deleteCaseImage instead */
export const deleteStudyImage = caseService.deleteCaseImage;
/** @deprecated Use updateCaseImage instead */
export const updateStudyImage = caseService.updateCaseImage;
/** @deprecated Use publishCase instead */
export const publishStudy = caseService.publishCase;
/** @deprecated Use closeCase instead */
export const closeStudyOld = caseService.closeCase;
/** @deprecated Use getCaseAnalytics instead */
export const getStudyAnalytics = caseService.getCaseAnalytics;
/** @deprecated Use listCaseResponses instead */
export const listStudyResponses = caseService.listCaseResponses;
/** @deprecated Use exportCaseResponses instead */
export const exportStudyResponsesOld = caseService.exportCaseResponses;
/** @deprecated Use listCaseUsers instead */
export const listStudyUsers = caseService.listCaseUsers;
/** @deprecated Use addCaseUser instead */
export const addStudyUser = caseService.addCaseUser;
/** @deprecated Use removeCaseUser instead */
export const removeStudyUser = caseService.removeCaseUser;

// Cohort aliases -> Study
/** @deprecated Use createStudy instead */
export const createCohort = studyService.createStudy;
/** @deprecated Use listStudies instead */
export const listCohorts = studyService.listStudies;
/** @deprecated Use getStudy instead */
export const getCohort = studyService.getStudy;
/** @deprecated Use updateStudy instead */
export const updateCohort = studyService.updateStudy;
/** @deprecated Use deleteStudy instead */
export const deleteCohort = studyService.deleteStudy;
/** @deprecated Use activateStudy instead */
export const activateCohort = studyService.activateStudy;
/** @deprecated Use closeStudy instead */
export const closeCohort = studyService.closeStudy;
/** @deprecated Use addCaseToStudy instead */
export const addCaseToCohort = studyService.addCaseToStudy;
/** @deprecated Use removeCaseFromStudy instead */
export const removeCaseFromCohort = studyService.removeCaseFromStudy;
/** @deprecated Use reorderStudyCases instead */
export const reorderCohortCases = studyService.reorderStudyCases;
/** @deprecated Use listStudyRaters instead */
export const listCohortUsers = studyService.listStudyRaters;
/** @deprecated Use addStudyRater instead */
export const addUserToCohort = studyService.addStudyRater;
/** @deprecated Use removeStudyRater instead */
export const removeUserFromCohort = studyService.removeStudyRater;
/** @deprecated Use getStudyRaterProgress instead */
export const getCohortRaterProgress = studyService.getStudyRaterProgress;
/** @deprecated Use getStudyReliabilityMetrics instead */
export const getCohortReliabilityMetrics = studyService.getStudyReliabilityMetrics;
/** @deprecated Use exportStudyResponses instead */
export const exportCohortResponses = studyService.exportStudyResponses;
/** @deprecated Use downloadStudyResponsesCSV instead */
export const downloadCohortResponsesCSV = studyService.downloadStudyResponsesCSV;

// ================================
// Namespaced Exports
// ================================

/**
 * Case API namespace with all case-related functions
 */
export const caseApi = {
  // User endpoints
  listPublishedCases: caseService.listPublishedCases,
  getPublishedCase: caseService.getPublishedCase,
  getImageSignedURL: caseService.getImageSignedURL,
  submitCaseResponse: caseService.submitCaseResponse,
  getMyResponses: caseService.getMyResponses,
  // User profile
  getUserProfile: caseService.getUserProfile,
  updateUserProfile: caseService.updateUserProfile,
  // Admin case endpoints
  createCase: caseService.createCase,
  listCases: caseService.listCases,
  getCase: caseService.getCase,
  updateCase: caseService.updateCase,
  deleteCase: caseService.deleteCase,
  uploadImage: caseService.uploadCaseImage,
  getAdminCaseImages: caseService.getAdminCaseImages,
  updateImage: caseService.updateCaseImage,
  deleteImage: caseService.deleteCaseImage,
  publishCase: caseService.publishCase,
  closeCase: caseService.closeCase,
  getCaseAnalytics: caseService.getCaseAnalytics,
  getReliabilityMetrics: caseService.getReliabilityMetrics,
  getDivergenceAnalysis: caseService.getDivergenceAnalysis,
  listCaseResponses: caseService.listCaseResponses,
  exportCaseResponses: caseService.exportCaseResponses,
  exportDetailedResponses: caseService.exportDetailedResponses,
  downloadDetailedResponsesCSV: caseService.downloadDetailedResponsesCSV,
  getAdminImageSignedURL: caseService.getAdminImageSignedURL,
  // Case user management (admin)
  listCaseUsers: caseService.listCaseUsers,
  addCaseUser: caseService.addCaseUser,
  removeCaseUser: caseService.removeCaseUser,
  // Helpers
  getImageUrl: caseService.getImageUrl,
  getAdminImageUrl: caseService.getAdminImageUrl,
};

/**
 * Study API namespace with all study-related functions
 */
export const studyApi = {
  // Study management (admin)
  createStudy: studyService.createStudy,
  listStudies: studyService.listStudies,
  getStudy: studyService.getStudy,
  updateStudy: studyService.updateStudy,
  deleteStudy: studyService.deleteStudy,
  activateStudy: studyService.activateStudy,
  closeStudy: studyService.closeStudy,
  addCaseToStudy: studyService.addCaseToStudy,
  removeCaseFromStudy: studyService.removeCaseFromStudy,
  reorderStudyCases: studyService.reorderStudyCases,
  listStudyRaters: studyService.listStudyRaters,
  addStudyRater: studyService.addStudyRater,
  removeStudyRater: studyService.removeStudyRater,
  getStudyRaterProgress: studyService.getStudyRaterProgress,
  getStudyReliabilityMetrics: studyService.getStudyReliabilityMetrics,
  exportStudyResponses: studyService.exportStudyResponses,
  downloadStudyResponsesCSV: studyService.downloadStudyResponsesCSV,
  // Backwards compatibility (deprecated)
  /** @deprecated Use caseApi instead */
  listPublishedStudies,
  /** @deprecated Use caseApi instead */
  getPublishedStudy,
  /** @deprecated Use caseApi instead */
  submitStudyResponse,
};
