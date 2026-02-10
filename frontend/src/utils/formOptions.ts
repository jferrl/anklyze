/**
 * Form options utility functions
 * Replaces the backend /api/options endpoint by constructing form options from local i18n translations
 */

import i18n from '../i18n/config';
import type { FormOptions, SelectOption, Question } from '@/types';

/**
 * Get all form options with translations from i18n
 * This replaces the getFormOptions() API call
 */
export function getLocalFormOptions(): FormOptions {
  const t = i18n.t.bind(i18n);

  // Questions
  const questions: Record<string, Question> = {
    involved_malleoli: {
      id: 'involved_malleoli',
      title: t('form.questions.involved_malleoli'),
    },
    posterior_fracture_type: {
      id: 'posterior_fracture_type',
      title: t('form.questions.posterior_fracture_type'),
    },
    medial_morphology: {
      id: 'medial_morphology',
      title: t('form.questions.medial_morphology'),
    },
    medial_morphology_lm: {
      id: 'medial_morphology_lm',
      title: t('form.questions.medial_morphology_lm'),
    },
    fibular_level: {
      id: 'fibular_level',
      title: t('form.questions.fibular_level'),
    },
    fibular_level_lm: {
      id: 'fibular_level_lm',
      title: t('form.questions.fibular_level_lm'),
    },
    fibular_level_tri: {
      id: 'fibular_level_tri',
      title: t('form.questions.fibular_level_tri'),
    },
    lateral_morphology: {
      id: 'lateral_morphology',
      title: t('form.questions.lateral_morphology'),
    },
    suprasindesmal_type: {
      id: 'suprasindesmal_type',
      title: t('form.questions.suprasindesmal_type'),
    },
    fibula_infrasindesmal_transverse: {
      id: 'fibula_infrasindesmal_transverse',
      title: t('form.questions.fibula_infrasindesmal_transverse'),
    },
    has_ct_scan: {
      id: 'has_ct_scan',
      title: t('form.questions.has_ct_scan'),
    },
    fibula_trace_pattern: {
      id: 'fibula_trace_pattern',
      title: t('form.questions.fibula_trace_pattern'),
    },
    fibular_level_for_transverse: {
      id: 'fibular_level_for_transverse',
      title: t('form.questions.fibular_level_for_transverse'),
    },
  };

  // Labels
  const labels: Record<string, string> = {
    yes: t('form.labels.yes'),
    no: t('form.labels.no'),
    high: t('form.labels.high'),
    low: t('form.labels.low'),
  };

  // Involved malleoli options
  const involved_malleoli: SelectOption[] = [
    { value: 'posterior_only', label: t('form.options.involvedMalleoli.posterior_only') },
    { value: 'medial_only', label: t('form.options.involvedMalleoli.medial_only') },
    { value: 'lateral_only', label: t('form.options.involvedMalleoli.lateral_only') },
    { value: 'medial_posterior', label: t('form.options.involvedMalleoli.medial_posterior') },
    { value: 'lateral_posterior', label: t('form.options.involvedMalleoli.lateral_posterior') },
    { value: 'lateral_medial', label: t('form.options.involvedMalleoli.lateral_medial') },
    { value: 'trimaleolar', label: t('form.options.involvedMalleoli.trimaleolar') },
  ];

  // Posterior fracture types (Bartonicek)
  const posterior_fracture_types: SelectOption[] = [
    { value: 'extraincisural', label: t('form.options.posteriorType.extraincisural') },
    { value: 'posterolateral', label: t('form.options.posteriorType.posterolateral') },
    { value: 'posteromedial_posterolateral', label: t('form.options.posteriorType.posteromedial_posterolateral') },
    { value: 'large_posterolateral', label: t('form.options.posteriorType.large_posterolateral') },
  ];

  // Medial morphology options
  const medial_morphology: SelectOption[] = [
    { value: 'oblique', label: t('form.options.medialMorphology.oblique') },
    { value: 'transverse', label: t('form.options.medialMorphology.transverse') },
  ];

  // Medial morphology options for lateral+medial path
  const medial_morphology_lm: SelectOption[] = [
    { value: 'oblique', label: t('form.options.medialMorphologyLM.oblique') },
    { value: 'transverse', label: t('form.options.medialMorphologyLM.transverse') },
  ];

  // Fibular level options
  const fibular_levels: SelectOption[] = [
    { value: 'infrasindesmal', label: t('form.options.fibularLevel.infrasindesmal') },
    { value: 'transindesmal', label: t('form.options.fibularLevel.transindesmal') },
    { value: 'suprasindesmal', label: t('form.options.fibularLevel.suprasindesmal') },
  ];

  // Lateral morphology options (lateral-only and lateral+posterior: 2 options per MMD)
  const lateral_morphology: SelectOption[] = [
    { value: 'oblique', label: t('form.options.lateralMorphology.oblique') },
    { value: 'spiral', label: t('form.options.lateralMorphology.spiral') },
  ];

  // Fibula morphology for lateral+medial and trimaleolar paths
  const fibula_morphology_lm_tri: SelectOption[] = [
    { value: 'transverse', label: t('form.options.fibulaMorphologyLMTri.transverse') },
    { value: 'oblique', label: t('form.options.fibulaMorphologyLMTri.oblique') },
    { value: 'spiral', label: t('form.options.fibulaMorphologyLMTri.spiral') },
  ];

  // Suprasindesmal type options
  const suprasindesmal_types: SelectOption[] = [
    { value: 'simple_diaphyseal', label: t('form.options.suprasindesmalType.simple_diaphyseal') },
    { value: 'multifragmentary', label: t('form.options.suprasindesmalType.multifragmentary') },
    { value: 'proximal', label: t('form.options.suprasindesmalType.proximal') },
  ];

  // Fibular level options for lateral+medial and trimaleolar (High/Low per MMD)
  const fibular_level_high_low: SelectOption[] = [
    { value: 'suprasindesmal', label: t('form.options.fibularLevelHighLow.high') },
    { value: 'transindesmal', label: t('form.options.fibularLevelHighLow.low') },
  ];

  // Fibular level for transverse morphology sub-level (only Infra/Trans)
  const fibular_level_for_transverse: SelectOption[] = [
    { value: 'infrasindesmal', label: t('form.options.fibularLevelForTransverse.infrasindesmal') },
    { value: 'transindesmal', label: t('form.options.fibularLevelForTransverse.transindesmal') },
  ];

  // Fibula trace pattern options
  const fibula_trace_patterns: SelectOption[] = [
    { value: 'parasindesmotic_short', label: t('form.options.fibulaTracePattern.parasindesmotic_short') },
    { value: 'parasindesmotic_long', label: t('form.options.fibulaTracePattern.parasindesmotic_long') },
  ];

  return {
    questions,
    labels,
    involved_malleoli,
    posterior_fracture_types,
    medial_morphology,
    medial_morphology_lm,
    fibular_levels,
    lateral_morphology,
    fibula_morphology_lm_tri,
    suprasindesmal_types,
    fibular_level_high_low,
    fibular_level_for_transverse,
    fibula_trace_patterns,
  };
}

/**
 * Get a specific question translation
 */
export function getQuestionTitle(questionId: string): string {
  return i18n.t(`form.questions.${questionId}`);
}

/**
 * Get a specific label translation
 */
export function getLabel(labelKey: string): string {
  return i18n.t(`form.labels.${labelKey}`);
}

/**
 * Get options for a specific field
 */
export function getFieldOptions(fieldName: string): SelectOption[] {
  const options = getLocalFormOptions();

  // Map field names to option arrays
  const fieldMap: Record<string, SelectOption[]> = {
    'involved_malleoli': options.involved_malleoli,
    'posterior_fracture_type': options.posterior_fracture_types,
    'medial_morphology': options.medial_morphology,
    'medial_morphology_lm': options.medial_morphology_lm,
    'fibular_level': options.fibular_levels,
    'fibular_level_lm': options.fibular_levels,
    'fibular_level_tri': options.fibular_levels,
    'lateral_morphology': options.lateral_morphology,
    'fibula_morphology_lm_tri': options.fibula_morphology_lm_tri,
    'suprasindesmal_type': options.suprasindesmal_types,
    'fibular_level_for_transverse': options.fibular_level_for_transverse,
    'fibula_trace_pattern': options.fibula_trace_patterns,
  };

  return fieldMap[fieldName] || [];
}
