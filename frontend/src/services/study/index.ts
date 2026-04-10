// Re-export all case-related functions
export {
  // User case endpoints
  listPublishedCases,
  getPublishedCase,
  getImageSignedURL,
  getBatchImageSignedURLs,
  getAdminImageSignedURL,
  submitCaseResponse,
  getMyResponses,
  // Admin case endpoints
  getDashboard,
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
  exportDetailedResponses,
  downloadDetailedResponsesCSV,
  // User profile endpoints
  getCurrentUser,
  getUserProfile,
  updateUserProfile,
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
  addAllCasesToStudy,
  removeCaseFromStudy,
  reorderStudyCases,
  // Study analytics
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
  getBatchImageSignedURLs: caseService.getBatchImageSignedURLs,
  submitCaseResponse: caseService.submitCaseResponse,
  getMyResponses: caseService.getMyResponses,
  // User profile
  getUserProfile: caseService.getUserProfile,
  updateUserProfile: caseService.updateUserProfile,
  // Admin case endpoints
  getDashboard: caseService.getDashboard,
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
  listCaseResponses: caseService.listCaseResponses,
  exportCaseResponses: caseService.exportCaseResponses,
  exportDetailedResponses: caseService.exportDetailedResponses,
  downloadDetailedResponsesCSV: caseService.downloadDetailedResponsesCSV,
  getAdminImageSignedURL: caseService.getAdminImageSignedURL,
  // Gold standard
  setGoldStandard: caseService.setGoldStandard,
  deleteGoldStandard: caseService.deleteGoldStandard,
  getGoldStandardAccuracy: caseService.getGoldStandardAccuracy,
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
  addAllCasesToStudy: studyService.addAllCasesToStudy,
  removeCaseFromStudy: studyService.removeCaseFromStudy,
  reorderStudyCases: studyService.reorderStudyCases,
  getStudyReliabilityMetrics: studyService.getStudyReliabilityMetrics,
  exportStudyResponses: studyService.exportStudyResponses,
  downloadStudyResponsesCSV: studyService.downloadStudyResponsesCSV,
};
