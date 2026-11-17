import type { getLocalFormOptions } from '@/utils/formOptions';
import type {
  FractureInput,
  InvolvedMalleoli,
  FibularLevel,
  LateralMorphology,
  SuprasindesmalType,
  FibulaTracePattern,
  FibulaTraceCount,
  MedialMorphology,
  PosteriorFractureType,
  ArticularInvolvement,
  LateralSubtype,
  MedialSubtype,
  FormOption,
} from '@/types';

type Options = ReturnType<typeof getLocalFormOptions>;

/** QuestionStepData is one visible question of the decision tree, with its current answer. */
export interface QuestionStepData {
  /** Field key; also the DOM id prefix of the question. */
  id: string;
  title: string;
  options: FormOption[];
  /** Selected option value, undefined while unanswered. */
  value: string | undefined;
  /** Form patch for choosing the option with this value. */
  toPatch: (value: string) => Partial<FractureInput>;
}

/**
 * getQuestionSteps returns the questions visible for the given answers, in tree order.
 * It is the single source of truth for the decision tree UI and the answered path.
 */
export function getQuestionSteps(
  formData: Partial<FractureInput>,
  options: Options,
  hasTACImages?: boolean,
): QuestionStepData[] {
  const showArticularInvolvementSelect = formData.involved_malleoli === 'posterior_only';
  const showArticularInvolvementYesNo = formData.involved_malleoli === 'medial_only';

  const showArticularDepression = (showArticularInvolvementSelect || showArticularInvolvementYesNo) &&
    formData.articular_involvement === 'large_with_extension';

  const showMedialMorphology = formData.involved_malleoli &&
    (
      formData.involved_malleoli === 'lateral_medial' ||
      (formData.involved_malleoli === 'medial_only' &&
        formData.articular_involvement === 'small_without_extension')
    );

  const showBimaleolarInfraQuestion = formData.involved_malleoli === 'lateral_medial' &&
    formData.medial_morphology === 'vertical';

  const lateralMedialReadyForFibularLevel = formData.involved_malleoli === 'lateral_medial' && (
    formData.medial_morphology === 'transverse_oblique' ||
    (formData.medial_morphology === 'vertical' && formData.fibula_infrasindesmal_transverse === false)
  );

  const showFibularLevel = formData.involved_malleoli &&
    (
      ['lateral_only', 'lateral_posterior', 'trimaleolar'].includes(formData.involved_malleoli) ||
      lateralMedialReadyForFibularLevel
    );

  // Trace count question: shown for transindesmal on lateral_only, lateral_medial, trimaleolar
  const showFibulaTraceCount = showFibularLevel &&
    formData.fibular_level === 'transindesmal' &&
    formData.involved_malleoli !== 'lateral_posterior';

  // For transindesmal paths with trace count, morphology requires trace count to be set
  // For lateral_posterior transindesmal, no trace count → show morphology directly
  const showLateralMorphology = showFibularLevel && formData.fibular_level &&
    formData.fibular_level !== 'infrasindesmal' && (
      formData.fibular_level !== 'transindesmal' ||
      formData.involved_malleoli === 'lateral_posterior' ||
      !!formData.fibula_trace_count
    );

  const showInfrasindesmalMorphology =
    (formData.involved_malleoli === 'lateral_only' && formData.fibular_level === 'infrasindesmal') ||
    (formData.involved_malleoli === 'lateral_medial' && formData.fibular_level === 'infrasindesmal') ||
    (formData.involved_malleoli === 'trimaleolar' && formData.fibular_level === 'infrasindesmal');

  const showLateralSubtype = formData.involved_malleoli === 'lateral_only' &&
    formData.fibular_level === 'transindesmal' &&
    formData.fibula_trace_count === 'single' &&
    !!formData.lateral_morphology;

  const showMedialSubtype = (
    formData.involved_malleoli === 'lateral_medial' && (
      (formData.fibular_level === 'transindesmal' &&
        formData.fibula_trace_count === 'single' &&
        !!formData.lateral_morphology) ||
      (formData.fibular_level === 'suprasindesmal' && !!formData.suprasindesmal_type &&
        formData.suprasindesmal_type !== 'proximal' && !!formData.fibula_trace_pattern)
    )
  ) || (
    formData.involved_malleoli === 'trimaleolar' &&
    formData.fibular_level === 'transindesmal' &&
    !!formData.lateral_morphology
  );

  const showFibulaHeadShortening = formData.involved_malleoli === 'lateral_medial' &&
    formData.fibular_level === 'suprasindesmal' &&
    formData.suprasindesmal_type === 'proximal';

  const showSuprasindesmalType = formData.fibular_level === 'suprasindesmal';

  const showFibulaTracePattern = formData.fibular_level === 'suprasindesmal' &&
    formData.suprasindesmal_type !== undefined &&
    formData.suprasindesmal_type !== 'proximal';

  // Paths that end by asking about the posterior fragment (CT, then Bartonicek type).
  const pathReachesPosterior = (() => {
    const m = formData.involved_malleoli;
    if (!m) return false;

    if (m === 'posterior_only' && formData.articular_involvement === 'small_without_extension') return true;
    if (m === 'medial_posterior') return true;
    if (m === 'lateral_posterior' && formData.fibular_level === 'infrasindesmal') return true;
    if (m === 'lateral_posterior' && formData.fibular_level === 'transindesmal' && !!formData.lateral_morphology) return true;
    if (m === 'lateral_posterior' && formData.fibular_level === 'suprasindesmal' &&
      !!formData.suprasindesmal_type &&
      (formData.suprasindesmal_type === 'proximal' || !!formData.fibula_trace_pattern)) return true;
    if (m === 'trimaleolar' && formData.fibular_level === 'infrasindesmal' && !!formData.infrasindesmal_morphology) return true;
    if (m === 'trimaleolar' && formData.fibular_level === 'transindesmal' &&
      !!formData.lateral_morphology && !!formData.medial_subtype) return true;
    if (m === 'trimaleolar' && formData.fibular_level === 'suprasindesmal' &&
      !!formData.suprasindesmal_type &&
      (formData.suprasindesmal_type === 'proximal' || !!formData.fibula_trace_pattern)) return true;
    return false;
  })();

  // CT scan: asked only without case context; with it the answer comes from the case images.
  const showCTScan = hasTACImages === undefined && pathReachesPosterior;

  const showPosteriorType =
    (hasTACImages === true || formData.has_ct_scan === true) && pathReachesPosterior;

  const getMorphologyOptions = () => {
    const m = formData.involved_malleoli;
    const isMulti = formData.fibula_trace_count === 'multiple';

    if (m === 'lateral_posterior') {
      // lateral+posterior: updated labels with 3 options (no trace count question)
      return options.lateral_morphology_lp || [];
    }
    if (m === 'lateral_medial') {
      return isMulti
        ? (options.fibula_morphology_lm_multi || [])
        : (options.fibula_morphology_lm || []);
    }
    if (m === 'trimaleolar') {
      return isMulti
        ? (options.fibula_morphology_tri_multi || [])
        : (options.fibula_morphology_tri || []);
    }
    // lateral_only
    return isMulti
      ? (options.lateral_morphology_multi || [])
      : (options.lateral_morphology || []);
  };

  const yesNoOptions = [
    { value: 'true', label: options.labels.yes },
    { value: 'false', label: options.labels.no },
  ];

  const isLmOrTri = ['lateral_medial', 'trimaleolar'].includes(formData.involved_malleoli || '');

  const steps: (QuestionStepData | false | undefined | '')[] = [
    {
      id: 'involved_malleoli',
      title: options.questions.involved_malleoli?.title || 'Which malleoli are fractured?',
      options: options.involved_malleoli || [],
      value: formData.involved_malleoli,
      toPatch: (value) => ({ involved_malleoli: value as InvolvedMalleoli }),
    },

    showArticularInvolvementSelect && {
      id: 'articular_involvement',
      title: options.questions.articular_involvement?.title || 'Articular surface involvement?',
      options: options.articular_involvement_options || [],
      value: formData.articular_involvement,
      toPatch: (value) => ({ articular_involvement: value as ArticularInvolvement }),
    },

    showArticularInvolvementYesNo && {
      id: 'articular_involvement',
      title: options.questions.articular_involvement_medial?.title || 'Is there significant articular involvement with metaphyseal extension?',
      options: yesNoOptions,
      value: formData.articular_involvement === 'large_with_extension' ? 'true' : formData.articular_involvement === 'small_without_extension' ? 'false' : undefined,
      toPatch: (value) => ({ articular_involvement: (value === 'true' ? 'large_with_extension' : 'small_without_extension') as ArticularInvolvement }),
    },

    showArticularDepression && {
      id: 'has_articular_depression',
      title: (formData.involved_malleoli === 'medial_only'
        ? options.questions.has_articular_depression_medial?.title
        : options.questions.has_articular_depression?.title) || 'Is articular depression present?',
      options: yesNoOptions,
      value: formData.has_articular_depression?.toString(),
      toPatch: (value) => ({ has_articular_depression: value === 'true' }),
    },

    showMedialMorphology && {
      id: 'medial_morphology',
      title: (formData.involved_malleoli === 'lateral_medial'
        ? options.questions.medial_morphology_lm?.title
        : options.questions.medial_morphology?.title) || 'Medial fracture morphology?',
      options: formData.involved_malleoli === 'lateral_medial'
        ? (options.medial_morphology_lm || [])
        : (options.medial_morphology || []),
      value: formData.medial_morphology,
      toPatch: (value) => ({ medial_morphology: value as MedialMorphology }),
    },

    showBimaleolarInfraQuestion && {
      id: 'fibula_infrasindesmal_transverse',
      title: options.questions.fibula_infrasindesmal_transverse?.title || 'Is fibula fracture infrasindesmal AND transverse?',
      options: yesNoOptions,
      value: formData.fibula_infrasindesmal_transverse?.toString(),
      toPatch: (value) => ({ fibula_infrasindesmal_transverse: value === 'true' }),
    },

    showFibularLevel && {
      id: 'fibular_level',
      title: (
        ['lateral_medial', 'lateral_posterior', 'trimaleolar'].includes(formData.involved_malleoli || '')
          ? options.questions.fibular_level_lm?.title
          : options.questions.fibular_level?.title
      ) || 'Fibular fracture level?',
      options: isLmOrTri
        ? (options.fibular_levels_tri || options.fibular_levels || [])
        : (options.fibular_levels || []),
      value: formData.fibular_level,
      toPatch: (value) => ({ fibular_level: value as FibularLevel }),
    },

    showFibulaTraceCount && {
      id: 'fibula_trace_count',
      title: options.questions.fibulaTraceCount?.title || 'How many fracture traces does the fibula have?',
      options: options.fibula_trace_count || [],
      value: formData.fibula_trace_count,
      toPatch: (value) => ({ fibula_trace_count: value as FibulaTraceCount }),
    },

    showLateralMorphology && !showSuprasindesmalType && {
      id: 'lateral_morphology',
      title: (isLmOrTri
        ? options.questions.lateral_morphology_lm_tri?.title
        : options.questions.lateral_morphology?.title) || 'Lateral fracture morphology?',
      options: getMorphologyOptions(),
      value: formData.lateral_morphology,
      toPatch: (value) => ({ lateral_morphology: value as LateralMorphology }),
    },

    showInfrasindesmalMorphology && {
      id: 'infrasindesmal_morphology',
      title: (isLmOrTri
        ? options.questions.infrasindesmal_morphology_lm_tri?.title
        : options.questions.infrasindesmal_morphology?.title) || 'Infrasyndesmal fracture morphology?',
      options: isLmOrTri
        ? (options.infrasindesmal_morphology_lm_tri || [])
        : (options.infrasindesmal_morphology || []),
      value: formData.infrasindesmal_morphology,
      toPatch: (value) => ({ infrasindesmal_morphology: value as LateralSubtype }),
    },

    showLateralSubtype && {
      id: 'lateral_subtype',
      title: options.questions.lateral_subtype?.title || 'Lateral fracture type?',
      options: options.lateral_subtype || [],
      value: formData.lateral_subtype,
      toPatch: (value) => ({ lateral_subtype: value as LateralSubtype }),
    },

    showSuprasindesmalType && {
      id: 'suprasindesmal_type',
      title: options.questions.suprasindesmal_type?.title || 'Suprasindesmotic fracture type?',
      options: formData.involved_malleoli === 'lateral_posterior'
        ? (options.suprasindesmal_types_lp || options.suprasindesmal_types || [])
        : (options.suprasindesmal_types || []),
      value: formData.suprasindesmal_type,
      toPatch: (value) => ({ suprasindesmal_type: value as SuprasindesmalType }),
    },

    showFibulaTracePattern && {
      id: 'fibula_trace_pattern',
      title: (formData.suprasindesmal_type === 'multifragmentary'
        ? options.questions.fibula_trace_pattern_multi?.title
        : formData.involved_malleoli === 'lateral_posterior'
          ? options.questions.fibula_trace_pattern_lp?.title
          : options.questions.fibula_trace_pattern?.title) || 'Fibula trace pattern?',
      options: formData.suprasindesmal_type === 'multifragmentary'
        ? (options.fibula_trace_patterns_multi_lp || options.fibula_trace_patterns || [])
        : formData.involved_malleoli === 'lateral_posterior'
          ? (options.fibula_trace_patterns_lp || options.fibula_trace_patterns || [])
          : (options.fibula_trace_patterns || []),
      value: formData.fibula_trace_pattern,
      toPatch: (value) => ({ fibula_trace_pattern: value as FibulaTracePattern }),
    },

    showMedialSubtype && {
      id: 'medial_subtype',
      title: options.questions.medial_subtype?.title || 'Medial malleolus type?',
      options: options.medial_subtype || [],
      value: formData.medial_subtype,
      toPatch: (value) => ({ medial_subtype: value as MedialSubtype }),
    },

    showFibulaHeadShortening && {
      id: 'has_fibula_head_shortening',
      title: options.questions.has_fibula_head_shortening?.title || 'Is there fibula head shortening?',
      options: yesNoOptions,
      value: formData.has_fibula_head_shortening?.toString(),
      toPatch: (value) => ({ has_fibula_head_shortening: value === 'true' }),
    },

    showCTScan && {
      id: 'has_ct_scan',
      title: options.questions.has_ct_scan?.title || 'Do you have a CT scan?',
      options: yesNoOptions,
      value: formData.has_ct_scan?.toString(),
      toPatch: (value) => ({ has_ct_scan: value === 'true' }),
    },

    showPosteriorType && {
      id: 'posterior_fracture_type',
      title: (
        formData.involved_malleoli === 'posterior_only'
          ? options.questions.posterior_fracture_type?.title
          : formData.involved_malleoli === 'medial_posterior'
            ? options.questions.posterior_fracture_type_med_post?.title
            : formData.involved_malleoli === 'lateral_posterior' && formData.fibular_level === 'infrasindesmal'
              ? options.questions.posterior_fracture_type_lp_infra?.title
              : formData.involved_malleoli === 'lateral_posterior'
                ? options.questions.posterior_fracture_type_med_post?.title
                : options.questions.posterior_fracture_type_posterior?.title
      ) || 'Posterior fracture type (Bartoníček)?',
      options: formData.involved_malleoli === 'medial_posterior'
        ? (options.posterior_fracture_types_medial_posterior || [])
        : formData.involved_malleoli === 'lateral_posterior' && formData.fibular_level === 'infrasindesmal'
          ? (options.posterior_fracture_types_lp_infra || options.posterior_fracture_types || [])
          : (options.posterior_fracture_types || []),
      value: formData.posterior_fracture_type,
      toPatch: (value) => ({ posterior_fracture_type: value as PosteriorFractureType }),
    },
  ];

  return steps.filter((step): step is QuestionStepData => !!step);
}
