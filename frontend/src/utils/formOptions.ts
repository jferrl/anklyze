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
    articular_involvement: {
      id: 'articular_involvement',
      title: t('form.questions.articularInvolvement'),
    },
    articular_involvement_medial: {
      id: 'articular_involvement_medial',
      title: t('form.questions.articularInvolvementMedial'),
    },
    has_articular_depression: {
      id: 'has_articular_depression',
      title: t('form.questions.articularDepression'),
    },
    is_posterior_posteromedial: {
      id: 'is_posterior_posteromedial',
      title: t('form.questions.posteriorPosteromedial'),
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

  // Posterior fracture types (Bartonicek) - 4 standard options
  const posterior_fracture_types: SelectOption[] = [
    { value: 'extraincisural', label: t('form.options.posteriorType.extraincisural') },
    { value: 'posterolateral', label: t('form.options.posteriorType.posterolateral') },
    { value: 'posteromedial_posterolateral', label: t('form.options.posteriorType.posteromedial_posterolateral') },
    { value: 'large_posterolateral', label: t('form.options.posteriorType.large_posterolateral') },
  ];

  // Posterior fracture types for medial+posterior path (5 options including extraincisural_posteromedial)
  const posterior_fracture_types_medial_posterior: SelectOption[] = [
    ...posterior_fracture_types,
    { value: 'extraincisural_posteromedial', label: t('form.options.posteriorType.extraincisural_posteromedial') },
  ];

  // Medial morphology options
  const medial_morphology: SelectOption[] = [
    { value: 'vertical', label: t('form.options.medialMorphology.vertical') },
    { value: 'transverse_oblique', label: t('form.options.medialMorphology.transverse_oblique') },
  ];

  // Medial morphology options for lateral+medial path
  const medial_morphology_lm: SelectOption[] = [
    { value: 'vertical', label: t('form.options.medialMorphologyLM.vertical') },
    { value: 'transverse_oblique', label: t('form.options.medialMorphologyLM.transverse_oblique') },
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
    { value: 'suprasindesmotic_far', label: t('form.options.fibulaTracePattern.suprasindesmotic_far') },
  ];

  // Articular involvement options (posterior-only, medial-only paths)
  const articular_involvement_options: SelectOption[] = [
    { value: 'large_with_extension', label: t('form.options.articularInvolvement.large_with_extension') },
    { value: 'small_without_extension', label: t('form.options.articularInvolvement.small_without_extension') },
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
    articular_involvement_options,
    posterior_fracture_types_medial_posterior,
  };
}

