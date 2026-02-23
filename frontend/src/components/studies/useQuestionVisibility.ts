import { useCallback, useMemo } from 'react';
import type { FractureInput } from '@/types';

export interface QuestionVisibility {
  // PATH: Posterior only
  showPosteriorHasCTScan: boolean;
  showPosteriorType: boolean;

  // PATH: Medial only
  showMedialMorphology: boolean;

  // PATH: Lateral only
  showLateralLevel: boolean;
  showLateralMorphologyTrans: boolean;
  showSuprasindesmalType: boolean;
  showLateralFibulaTracePattern: boolean;

  // PATH: Lateral + Posterior
  showLateralPosteriorLevel: boolean;
  showLPMorphologyTrans: boolean;
  showLPHasCTScanTransSpiral: boolean;
  showLPPosteriorTypeTransSpiral: boolean;
  showLPHasCTScanTransOblique: boolean;
  showLPPosteriorTypeTransOblique: boolean;
  showLPSuprasindesmalType: boolean;
  showLPFibulaTracePattern: boolean;
  showLPHasCTScanSupra: boolean;
  showLPPosteriorTypeSupra: boolean;

  // PATH: Lateral + Medial
  showLMMedialMorphology: boolean;
  showLMFibulaInfraTransverse: boolean;
  showLMFibularLevel: boolean;
  showLMSuprasindesmalType: boolean;
  showLMFibulaTracePattern: boolean;
  showLMFibularMorphology: boolean;

  // PATH: Medial + Posterior
  showMedialPosteriorMorphology: boolean;
  showMPHasCTScan: boolean;
  showMPPosteriorType: boolean;

  // PATH: Trimaleolar
  showTrimaleolarFibularHeight: boolean;
  showTrimaleolarSupraType: boolean;
  showTriFibulaTracePattern: boolean;
  showTriHasCTScan: boolean;
  showTriPosteriorType: boolean;
  showTriLateralMorphologyTransComplete: boolean;

  // Functions
  isFormComplete: () => boolean;
  calculateProgress: () => number;
}

export function useQuestionVisibility(
  formData: Partial<FractureInput>,
  hasTACImages: boolean
): QuestionVisibility {
  const involvedMalleoli = formData.involved_malleoli;

  const visibility = useMemo(() => {
    // PATH: Posterior only - CT scan question (auto-answered if TAC images)
    const showPosteriorHasCTScan = involvedMalleoli === 'posterior_only' && !hasTACImages;
    const showPosteriorType = involvedMalleoli === 'posterior_only' && formData.has_ct_scan === true;

    // PATH: Medial only
    const showMedialMorphology = involvedMalleoli === 'medial_only';

    // PATH: Lateral only
    const showLateralLevel = involvedMalleoli === 'lateral_only';
    const showLateralMorphologyTrans = showLateralLevel && formData.fibular_level === 'transindesmal';
    const showSuprasindesmalType = showLateralLevel && formData.fibular_level === 'suprasindesmal';
    const showLateralFibulaTracePattern = showSuprasindesmalType &&
      (formData.suprasindesmal_type === 'simple_diaphyseal' || formData.suprasindesmal_type === 'multifragmentary');

    // PATH: Lateral + Posterior
    const showLateralPosteriorLevel = involvedMalleoli === 'lateral_posterior';
    const showLPMorphologyTrans = showLateralPosteriorLevel && formData.fibular_level === 'transindesmal';
    const showLPHasCTScanTransSpiral = showLPMorphologyTrans && formData.lateral_morphology === 'spiral' && !hasTACImages;
    const showLPPosteriorTypeTransSpiral = showLPMorphologyTrans && formData.lateral_morphology === 'spiral' && formData.has_ct_scan === true;
    const showLPHasCTScanTransOblique = showLPMorphologyTrans && formData.lateral_morphology === 'oblique' && !hasTACImages;
    const showLPPosteriorTypeTransOblique = showLPMorphologyTrans && formData.lateral_morphology === 'oblique' && formData.has_ct_scan === true;
    const showLPSuprasindesmalType = showLateralPosteriorLevel && formData.fibular_level === 'suprasindesmal';
    const showLPFibulaTracePattern = showLPSuprasindesmalType &&
      (formData.suprasindesmal_type === 'simple_diaphyseal' || formData.suprasindesmal_type === 'multifragmentary');
    const showLPHasCTScanSupra = (showLPFibulaTracePattern ||
      (showLPSuprasindesmalType && formData.suprasindesmal_type === 'proximal')) && !hasTACImages;
    const showLPPosteriorTypeSupra = (showLPFibulaTracePattern ||
      (showLPSuprasindesmalType && formData.suprasindesmal_type === 'proximal')) && formData.has_ct_scan === true;

    // PATH: Lateral + Medial
    const showLMMedialMorphology = involvedMalleoli === 'lateral_medial';
    const showLMFibulaInfraTransverse = showLMMedialMorphology && formData.medial_morphology === 'vertical';
    const showLMFibularLevel = showLMMedialMorphology && (
      (formData.medial_morphology === 'vertical' && formData.fibula_infrasindesmal_transverse === false) ||
      formData.medial_morphology === 'transverse_oblique'
    );
    const showLMSuprasindesmalType = showLMFibularLevel && formData.fibular_level_for_transverse === 'suprasindesmal';
    const showLMFibulaTracePattern = showLMSuprasindesmalType &&
      (formData.suprasindesmal_type === 'simple_diaphyseal' || formData.suprasindesmal_type === 'multifragmentary');
    const showLMFibularMorphology = showLMFibularLevel &&
      (formData.fibular_level_for_transverse === 'infrasindesmal' || formData.fibular_level_for_transverse === 'transindesmal');

    // PATH: Medial + Posterior
    const showMedialPosteriorMorphology = involvedMalleoli === 'medial_posterior';
    const showMPHasCTScan = showMedialPosteriorMorphology && !hasTACImages;
    const showMPPosteriorType = showMedialPosteriorMorphology && formData.has_ct_scan === true;

    // PATH: Trimaleolar
    const showTrimaleolarFibularHeight = involvedMalleoli === 'trimaleolar';
    const showTrimaleolarSupraType = showTrimaleolarFibularHeight && formData.fibular_level === 'suprasindesmal';
    const showTriFibulaTracePattern = showTrimaleolarSupraType &&
      (formData.suprasindesmal_type === 'simple_diaphyseal' || formData.suprasindesmal_type === 'multifragmentary');
    const showTriHasCTScan = (showTriFibulaTracePattern ||
      (showTrimaleolarSupraType && formData.suprasindesmal_type === 'proximal') ||
      (showTrimaleolarFibularHeight && (formData.fibular_level === 'infrasindesmal' || formData.fibular_level === 'transindesmal'))) && !hasTACImages;
    const showTriPosteriorType = showTriHasCTScan === false && showTrimaleolarFibularHeight && formData.has_ct_scan === true;
    const showTriLateralMorphologyTrans = showTrimaleolarFibularHeight && formData.fibular_level === 'transindesmal';
    const showTriLateralMorphologyTransComplete = showTriLateralMorphologyTrans && (formData.has_ct_scan === true || hasTACImages);

    return {
      showPosteriorHasCTScan,
      showPosteriorType,
      showMedialMorphology,
      showLateralLevel,
      showLateralMorphologyTrans,
      showSuprasindesmalType,
      showLateralFibulaTracePattern,
      showLateralPosteriorLevel,
      showLPMorphologyTrans,
      showLPHasCTScanTransSpiral,
      showLPPosteriorTypeTransSpiral,
      showLPHasCTScanTransOblique,
      showLPPosteriorTypeTransOblique,
      showLPSuprasindesmalType,
      showLPFibulaTracePattern,
      showLPHasCTScanSupra,
      showLPPosteriorTypeSupra,
      showLMMedialMorphology,
      showLMFibulaInfraTransverse,
      showLMFibularLevel,
      showLMSuprasindesmalType,
      showLMFibulaTracePattern,
      showLMFibularMorphology,
      showMedialPosteriorMorphology,
      showMPHasCTScan,
      showMPPosteriorType,
      showTrimaleolarFibularHeight,
      showTrimaleolarSupraType,
      showTriFibulaTracePattern,
      showTriHasCTScan,
      showTriPosteriorType,
      showTriLateralMorphologyTransComplete,
    };
  }, [involvedMalleoli, formData, hasTACImages]);

  // Calculate progress
  const calculateProgress = useCallback((): number => {
    if (!involvedMalleoli) return 0;

    let totalSteps = 1; // involved_malleoli is always step 1
    let completedSteps = 1;

    // Different paths have different numbers of steps
    switch (involvedMalleoli) {
      case 'posterior_only':
        totalSteps = formData.has_ct_scan ? 3 : 2;
        if (formData.has_ct_scan !== undefined) completedSteps++;
        if (formData.posterior_fracture_type) completedSteps++;
        break;
      case 'medial_only':
        totalSteps = 2;
        if (formData.medial_morphology) completedSteps++;
        break;
      case 'lateral_only':
        totalSteps = 3;
        if (formData.fibular_level) completedSteps++;
        if (formData.lateral_morphology || formData.suprasindesmal_type) completedSteps++;
        break;
      default:
        totalSteps = 4;
        completedSteps = Math.min(Object.keys(formData).length, totalSteps);
    }

    return Math.round((completedSteps / totalSteps) * 100);
  }, [involvedMalleoli, formData]);

  // Check if form is complete
  const isFormComplete = useCallback((): boolean => {
    if (!involvedMalleoli) return false;

    switch (involvedMalleoli) {
      case 'posterior_only':
        if (formData.has_ct_scan === undefined) return false;
        if (formData.has_ct_scan === false) return true;
        return !!formData.posterior_fracture_type;

      case 'medial_only':
        return !!formData.medial_morphology;

      case 'lateral_only':
        if (!formData.fibular_level) return false;
        if (formData.fibular_level === 'infrasindesmal') return true;
        if (formData.fibular_level === 'transindesmal') return !!formData.lateral_morphology;
        if (formData.fibular_level === 'suprasindesmal') {
          if (!formData.suprasindesmal_type) return false;
          if (formData.suprasindesmal_type === 'proximal') return true;
          return !!formData.fibula_trace_pattern;
        }
        return false;

      case 'medial_posterior':
        if (formData.has_ct_scan === undefined) return false;
        if (formData.has_ct_scan === false) return !!formData.medial_morphology;
        return !!formData.medial_morphology && !!formData.posterior_fracture_type;

      case 'lateral_posterior':
        if (!formData.fibular_level) return false;
        return true;

      case 'lateral_medial':
        if (!formData.medial_morphology) return false;
        return true;

      case 'trimaleolar':
        if (!formData.fibular_level) return false;
        return true;

      default:
        return false;
    }
  }, [involvedMalleoli, formData]);

  return {
    ...visibility,
    isFormComplete,
    calculateProgress,
  };
}
