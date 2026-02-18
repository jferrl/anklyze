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
};
