export { ImageGrid } from './ImageGrid';
export { ImageLightbox } from './ImageLightbox';
export { CaseHeader } from './StudyHeader';
export { PreviousResponses } from './PreviousResponses';
export { ClassificationPanel } from './ClassificationPanel';
export { CaseClassificationForm, type AnswerTracking, type QuestionAnswer } from './StudyClassificationForm';
export { GoldStandardInputDialog } from './GoldStandardInputDialog';
export { ReferenceClassificationForm } from './ReferenceClassificationForm';

// Backwards compatibility aliases (deprecated)
/** @deprecated Use CaseHeader instead */
export { CaseHeader as StudyHeader } from './StudyHeader';
/** @deprecated Use CaseClassificationForm instead */
export { CaseClassificationForm as StudyClassificationForm } from './StudyClassificationForm';
