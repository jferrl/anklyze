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
    posterior_fracture_type_med_post: {
      id: 'posterior_fracture_type_med_post',
      title: t('form.questions.posterior_fracture_type_med_post'),
    },
    posterior_fracture_type_posterior: {
      id: 'posterior_fracture_type_posterior',
      title: t('form.questions.posterior_fracture_type_posterior'),
    },
    posterior_fracture_type_lp_infra: {
      id: 'posterior_fracture_type_lp_infra',
      title: t('form.questions.posterior_fracture_type_lp_infra'),
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
    lateral_morphology_lm_tri: {
      id: 'lateral_morphology_lm_tri',
      title: t('form.questions.lateral_morphology_lm_tri'),
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
    fibula_trace_pattern_lp: {
      id: 'fibula_trace_pattern_lp',
      title: t('form.questions.fibula_trace_pattern_lp'),
    },
    fibula_trace_pattern_multi: {
      id: 'fibula_trace_pattern_multi',
      title: t('form.questions.fibula_trace_pattern_multi'),
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
    has_articular_depression_medial: {
      id: 'has_articular_depression_medial',
      title: t('form.questions.articularDepressionMedial'),
    },
    is_posterior_posteromedial: {
      id: 'is_posterior_posteromedial',
      title: t('form.questions.posteriorPosteromedial'),
    },
    infrasindesmal_morphology: {
      id: 'infrasindesmal_morphology',
      title: t('form.questions.infrasindesmalMorphology'),
    },
    infrasindesmal_morphology_lm_tri: {
      id: 'infrasindesmal_morphology_lm_tri',
      title: t('form.questions.infrasindesmalMorphologyLMTri'),
    },
    lateral_subtype: {
      id: 'lateral_subtype',
      title: t('form.questions.lateralSubtype'),
    },
    medial_subtype: {
      id: 'medial_subtype',
      title: t('form.questions.medialSubtype'),
    },
    has_fibula_head_shortening: {
      id: 'has_fibula_head_shortening',
      title: t('form.questions.hasFibulaHeadShortening'),
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

  // Posterior fracture types for lateral+posterior infrasindesmal (extraincisural has "posterior" qualifier per drawio)
  const posterior_fracture_types_lp_infra: SelectOption[] = [
    { value: 'extraincisural', label: t('form.options.posteriorTypeLPInfra.extraincisural') },
    { value: 'posterolateral', label: t('form.options.posteriorTypeLPInfra.posterolateral') },
    { value: 'posteromedial_posterolateral', label: t('form.options.posteriorTypeLPInfra.posteromedial_posterolateral') },
    { value: 'large_posterolateral', label: t('form.options.posteriorTypeLPInfra.large_posterolateral') },
  ];

  // Posterior fracture types for medial+posterior path (5 options including extraincisural_posteromedial)
  // Uses branch-specific label for extraincisural ("posterior" qualifier per drawio)
  const posterior_fracture_types_medial_posterior: SelectOption[] = [
    { value: 'extraincisural_posteromedial', label: t('form.options.posteriorType.extraincisural_posteromedial') },
    { value: 'extraincisural', label: t('form.options.posteriorTypeMedPost.extraincisural') },
    { value: 'posterolateral', label: t('form.options.posteriorType.posterolateral') },
    { value: 'posteromedial_posterolateral', label: t('form.options.posteriorType.posteromedial_posterolateral') },
    { value: 'large_posterolateral', label: t('form.options.posteriorType.large_posterolateral') },
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

  // Fibula morphology for lateral+medial transindesmal (3 options per drawio)
  const fibula_morphology_lm: SelectOption[] = [
    { value: 'transverse', label: t('form.options.fibulaMorphologyLM.transverse') },
    { value: 'spiral', label: t('form.options.fibulaMorphologyLM.spiral') },
    { value: 'conminuta', label: t('form.options.fibulaMorphologyLM.conminuta') },
  ];

  // Fibula morphology for trimaleolar transindesmal (3 options per drawio: Transversa → Espiroidea → Conminuta)
  const fibula_morphology_tri: SelectOption[] = [
    { value: 'transverse', label: t('form.options.fibulaMorphologyTri.transverse') },
    { value: 'spiral', label: t('form.options.fibulaMorphologyTri.spiral') },
    { value: 'conminuta', label: t('form.options.fibulaMorphologyTri.conminuta') },
  ];

  // Infrasindesmal morphology options for lateral_only (avulsion vs malleolus fracture)
  const infrasindesmal_morphology: SelectOption[] = [
    { value: 'avulsion', label: t('form.options.infrasindesmalMorphology.avulsion') },
    { value: 'malleolus_fracture', label: t('form.options.infrasindesmalMorphology.malleolus_fracture') },
  ];

  // Infrasindesmal morphology options for lateral_medial / trimaleolar
  const infrasindesmal_morphology_lm_tri: SelectOption[] = [
    { value: 'avulsion', label: t('form.options.infrasindesmalMorphologyLMTri.avulsion') },
    { value: 'malleolus_fracture', label: t('form.options.infrasindesmalMorphologyLMTri.malleolus_fracture') },
  ];

  // Lateral subtype options for transindesmal lateral-only
  const lateral_subtype: SelectOption[] = [
    { value: 'simple', label: t('form.options.lateralSubtype.simple') },
    { value: 'syndesmosis_rupture', label: t('form.options.lateralSubtype.syndesmosis_rupture') },
    { value: 'butterfly', label: t('form.options.lateralSubtype.butterfly') },
  ];

  // Medial subtype options for bimalleolar paths
  const medial_subtype: SelectOption[] = [
    { value: 'open_mortise', label: t('form.options.medialSubtype.open_mortise') },
    { value: 'malleolus_fracture', label: t('form.options.medialSubtype.malleolus_fracture') },
  ];

  // Suprasindesmal type options
  const suprasindesmal_types: SelectOption[] = [
    { value: 'simple_diaphyseal', label: t('form.options.suprasindesmalType.simple_diaphyseal') },
    { value: 'multifragmentary', label: t('form.options.suprasindesmalType.multifragmentary') },
    { value: 'proximal', label: t('form.options.suprasindesmalType.proximal') },
  ];

  // Suprasindesmal type options for lateral+posterior (includes qualifiers per drawio)
  const suprasindesmal_types_lp: SelectOption[] = [
    { value: 'simple_diaphyseal', label: t('form.options.suprasindesmalTypeLP.simple_diaphyseal') },
    { value: 'multifragmentary', label: t('form.options.suprasindesmalTypeLP.multifragmentary') },
    { value: 'proximal', label: t('form.options.suprasindesmalTypeLP.proximal') },
  ];

  // Fibular level options for lateral+medial and trimaleolar (High/Low per MMD)
  const fibular_level_high_low: SelectOption[] = [
    { value: 'suprasindesmal', label: t('form.options.fibularLevelHighLow.high') },
    { value: 'transindesmal', label: t('form.options.fibularLevelHighLow.low') },
  ];

  // Fibular level options for trimaleolar (3 options with "Suprasindesmal" label per drawio)
  const fibular_levels_tri: SelectOption[] = [
    { value: 'infrasindesmal', label: t('form.options.fibularLevel.infrasindesmal') },
    { value: 'transindesmal', label: t('form.options.fibularLevel.transindesmal') },
    { value: 'suprasindesmal', label: t('form.options.fibularLevelHighLow.high') },
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

  // Fibula trace pattern options for lateral+posterior Diafisaria Simple (with distance qualifiers per drawio)
  const fibula_trace_patterns_lp: SelectOption[] = [
    { value: 'parasindesmotic_short', label: t('form.options.fibulaTracePatternLP.parasindesmotic_short') },
    { value: 'parasindesmotic_long', label: t('form.options.fibulaTracePatternLP.parasindesmotic_long') },
    { value: 'suprasindesmotic_far', label: t('form.options.fibulaTracePatternLP.suprasindesmotic_far') },
  ];

  // Fibula trace pattern options for lateral+posterior Multifragmentaria (per drawio)
  const fibula_trace_patterns_multi_lp: SelectOption[] = [
    { value: 'parasindesmotic_short', label: t('form.options.fibulaTracePatternMultiLP.parasindesmotic_short') },
    { value: 'parasindesmotic_long', label: t('form.options.fibulaTracePatternMultiLP.parasindesmotic_long') },
    { value: 'suprasindesmotic_far', label: t('form.options.fibulaTracePatternMultiLP.suprasindesmotic_far') },
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
    fibula_morphology_lm,
    fibula_morphology_tri,
    suprasindesmal_types,
    fibular_level_high_low,
    fibular_levels_tri,
    fibular_level_for_transverse,
    fibula_trace_patterns,
    articular_involvement_options,
    posterior_fracture_types_medial_posterior,
    suprasindesmal_types_lp,
    fibula_trace_patterns_lp,
    fibula_trace_patterns_multi_lp,
    posterior_fracture_types_lp_infra,
    infrasindesmal_morphology,
    infrasindesmal_morphology_lm_tri,
    lateral_subtype,
    medial_subtype,
  };
}

