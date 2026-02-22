import type { FractureInput } from '@/types';

/**
 * Check if form is complete and ready for classification
 */
export function isFormComplete(formData: Partial<FractureInput>): boolean {
  const { involved_malleoli } = formData;
  if (!involved_malleoli) return false;

  // Each path has different required fields based on MMD decision tree
  switch (involved_malleoli) {
    case 'posterior_only':
      if (!formData.articular_involvement) return false;
      if (formData.articular_involvement === 'large_with_extension') {
        return formData.has_articular_depression !== undefined;
      }
      // small_without_extension path
      if (formData.has_ct_scan === undefined) return false;
      if (formData.has_ct_scan === true && !formData.posterior_fracture_type) return false;
      return true;

    case 'medial_only':
      if (!formData.articular_involvement) return false;
      if (formData.articular_involvement === 'large_with_extension') {
        return formData.has_articular_depression !== undefined;
      }
      return !!formData.medial_morphology;

    case 'lateral_only':
      if (!formData.fibular_level) return false;
      if (formData.fibular_level === 'infrasindesmal') return true;
      if (formData.fibular_level === 'suprasindesmal') {
        if (!formData.suprasindesmal_type) return false;
        if (formData.suprasindesmal_type !== 'proximal' && !formData.fibula_trace_pattern) return false;
        return true;
      }
      if (!formData.lateral_morphology) return false;
      return true;

    case 'medial_posterior':
      if (formData.has_ct_scan === undefined) return false;
      if (formData.has_ct_scan === false) return true;
      if (!formData.posterior_fracture_type) return false;
      return true;

    case 'lateral_posterior':
      if (!formData.fibular_level) return false;
      if (formData.fibular_level === 'infrasindesmal') {
        if (formData.has_ct_scan === undefined) return false;
        if (formData.has_ct_scan === false) return true;
        if (formData.is_posterior_posteromedial === undefined) return false;
        if (formData.is_posterior_posteromedial === true) return true;
        return !!formData.posterior_fracture_type;
      }
      if (formData.fibular_level === 'suprasindesmal') {
        if (!formData.suprasindesmal_type) return false;
        if (formData.suprasindesmal_type !== 'proximal' && !formData.fibula_trace_pattern) return false;
        if (formData.has_ct_scan === undefined) return false;
        if (formData.has_ct_scan === true && !formData.posterior_fracture_type) return false;
        return true;
      }
      if (!formData.lateral_morphology) return false;
      if (formData.has_ct_scan === undefined) return false;
      if (formData.has_ct_scan === true && !formData.posterior_fracture_type) return false;
      return true;

    case 'lateral_medial':
      if (!formData.medial_morphology) return false;
      if (formData.medial_morphology === 'oblique') {
        if (formData.fibula_infrasindesmal_transverse === undefined) return false;
        if (formData.fibula_infrasindesmal_transverse === true) return true;
      }
      if (!formData.fibular_level) return false;
      if (formData.fibular_level === 'suprasindesmal') {
        if (!formData.suprasindesmal_type) return false;
        if (formData.suprasindesmal_type !== 'proximal' && !formData.fibula_trace_pattern) return false;
        return true;
      }
      if (!formData.lateral_morphology) return false;
      if (formData.lateral_morphology === 'transverse' && !formData.fibular_level_for_transverse) return false;
      return true;

    case 'trimaleolar':
      if (!formData.fibular_level) return false;
      if (formData.fibular_level === 'suprasindesmal') {
        if (!formData.suprasindesmal_type) return false;
        if (formData.suprasindesmal_type !== 'proximal' && !formData.fibula_trace_pattern) return false;
        if (formData.has_ct_scan === undefined) return false;
        if (formData.has_ct_scan === true && !formData.posterior_fracture_type) return false;
        return true;
      }
      if (!formData.lateral_morphology) return false;
      if (formData.lateral_morphology === 'transverse') {
        if (!formData.fibular_level_for_transverse) return false;
        // Transverse + infrasindesmal is impossible/exceptional - form complete, no CT needed
        if (formData.fibular_level_for_transverse === 'infrasindesmal') return true;
      }
      if (formData.has_ct_scan === undefined) return false;
      if (formData.has_ct_scan === true && !formData.posterior_fracture_type) return false;
      return true;

    default:
      return false;
  }
}

/**
 * Calculate form progress based on filled fields
 */
export function calculateProgress(formData: Partial<FractureInput>): { currentStep: number; totalSteps: number } {
  const filled = Object.keys(formData).filter(key =>
    formData[key as keyof FractureInput] !== undefined &&
    formData[key as keyof FractureInput] !== null
  ).length;

  // Estimate total steps based on involved_malleoli
  let estimatedTotal = 1; // Start with involved_malleoli question

  if (formData.involved_malleoli) {
    const type = formData.involved_malleoli;

    // Articular involvement step for posterior_only and medial_only
    if (['posterior_only', 'medial_only'].includes(type)) {
      estimatedTotal += 1; // articular_involvement
      if (formData.articular_involvement === 'large_with_extension') {
        estimatedTotal += 1; // has_articular_depression
      }
    }
    if (['lateral_only', 'lateral_posterior', 'lateral_medial', 'trimaleolar'].includes(type)) {
      estimatedTotal += 2; // fibular_level + lateral_morphology
    }
    if (type === 'medial_only' && formData.articular_involvement !== 'large_with_extension') {
      estimatedTotal += 1; // medial_morphology (only for small_without_extension)
    }
    if (type === 'lateral_medial') {
      estimatedTotal += 1; // medial_morphology
    }
    if (['posterior_only', 'medial_posterior', 'lateral_posterior', 'trimaleolar'].includes(type)) {
      if (type !== 'posterior_only' || formData.articular_involvement !== 'large_with_extension') {
        estimatedTotal += 2; // has_ct_scan + optional posterior_type
      }
    }
    if (formData.fibular_level === 'suprasindesmal') {
      estimatedTotal += 1; // suprasindesmal_type or trace pattern
    }
    if (type === 'lateral_medial' && formData.medial_morphology === 'oblique') {
      estimatedTotal += 1; // bimaleolar infra question
    }
    if (type === 'lateral_posterior' && formData.fibular_level === 'infrasindesmal' && formData.has_ct_scan === true) {
      estimatedTotal += 1; // is_posterior_posteromedial
    }
  }

  return {
    currentStep: Math.min(filled, estimatedTotal),
    totalSteps: estimatedTotal,
  };
}
