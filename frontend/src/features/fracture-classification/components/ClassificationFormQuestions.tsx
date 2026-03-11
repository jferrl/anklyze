import { useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getLocalFormOptions } from '@/utils/formOptions';
import type {
  FractureInput,
  InvolvedMalleoli,
  FibularLevel,
  LateralMorphology,
  SuprasindesmalType,
  FibulaTracePattern,
  MedialMorphology,
  PosteriorFractureType,
  ArticularInvolvement,
  LateralSubtype,
  MedialSubtype,
} from '@/types';
import { QuestionStep } from './QuestionStep';

interface ClassificationFormQuestionsProps {
  formData: Partial<FractureInput>;
  onUpdate: (newData: Partial<FractureInput>) => void;
  /** When true, has_ct_scan is auto-set and CT question is skipped */
  hasTACImages?: boolean;
}

/**
 * Shared classification form questions component.
 *
 * Single source of truth for the fracture classification decision tree UI.
 * Used by /classify page, study rater classification, and gold standard input.
 */
export function ClassificationFormQuestions({
  formData,
  onUpdate,
  hasTACImages = false,
}: ClassificationFormQuestionsProps) {
  const { i18n } = useTranslation();
  const formEndRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const options = useMemo(() => getLocalFormOptions(), [i18n.language]);

  // Auto-scroll when form data changes
  useEffect(() => {
    if (Object.keys(formData).length > 0 && formEndRef.current) {
      const timer = setTimeout(() => {
        formEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [formData]);

  // --- Question visibility logic (authoritative decision tree) ---

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

  const showLateralMorphology = showFibularLevel && formData.fibular_level &&
    formData.fibular_level !== 'infrasindesmal';

  const showInfrasindesmalMorphology =
    (formData.involved_malleoli === 'lateral_only' && formData.fibular_level === 'infrasindesmal') ||
    (formData.involved_malleoli === 'lateral_medial' && formData.fibular_level === 'infrasindesmal') ||
    (formData.involved_malleoli === 'trimaleolar' && formData.fibular_level === 'infrasindesmal');

  const showLateralSubtype = formData.involved_malleoli === 'lateral_only' &&
    formData.fibular_level === 'transindesmal' && !!formData.lateral_morphology;

  const showMedialSubtype = (
    formData.involved_malleoli === 'lateral_medial' && (
      (formData.fibular_level === 'transindesmal' && !!formData.lateral_morphology &&
        formData.lateral_morphology !== 'conminuta') ||
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

  // CT scan: show only after ALL preceding questions for the current path are answered
  const showCTScan = !hasTACImages && formData.involved_malleoli && (
    (formData.involved_malleoli === 'posterior_only' &&
      formData.articular_involvement === 'small_without_extension') ||
    formData.involved_malleoli === 'medial_posterior' ||
    (formData.involved_malleoli === 'lateral_posterior' && formData.fibular_level === 'infrasindesmal') ||
    (formData.involved_malleoli === 'lateral_posterior' && formData.fibular_level === 'transindesmal' &&
      !!formData.lateral_morphology) ||
    (formData.involved_malleoli === 'lateral_posterior' && formData.fibular_level === 'suprasindesmal' &&
      !!formData.suprasindesmal_type &&
      (formData.suprasindesmal_type === 'proximal' || !!formData.fibula_trace_pattern)) ||
    (formData.involved_malleoli === 'trimaleolar' && formData.fibular_level === 'infrasindesmal' &&
      !!formData.infrasindesmal_morphology) ||
    (formData.involved_malleoli === 'trimaleolar' && formData.fibular_level === 'transindesmal' &&
      !!formData.lateral_morphology && !!formData.medial_subtype) ||
    (formData.involved_malleoli === 'trimaleolar' && formData.fibular_level === 'suprasindesmal' &&
      !!formData.suprasindesmal_type &&
      (formData.suprasindesmal_type === 'proximal' || !!formData.fibula_trace_pattern))
  );

  // Posterior type: after CT=true (either explicit or auto from TAC images)
  const showPosteriorType = (() => {
    const hasCT = hasTACImages || formData.has_ct_scan === true;
    if (!hasCT) return false;

    // For hasTACImages, the CT question is skipped but we still need to check
    // whether the path requires a CT question before showing posterior type
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

  // Yes/No options for boolean questions
  const yesNoOptions = [
    { value: 'true', label: options.labels.yes },
    { value: 'false', label: options.labels.no },
  ];

  return (
    <>
      <QuestionStep
        question={{
          id: 'involved_malleoli',
          title: options.questions.involved_malleoli?.title || 'Which malleoli are fractured?',
        }}
        value={formData.involved_malleoli}
        options={options.involved_malleoli || []}
        onChange={(value) => onUpdate({
          involved_malleoli: value as InvolvedMalleoli,
          ...(hasTACImages ? { has_ct_scan: true } : {}),
        })}
      />

      {showArticularInvolvementSelect && (
        <QuestionStep
          question={{
            id: 'articular_involvement',
            title: options.questions.articular_involvement?.title || 'Articular surface involvement?',
          }}
          value={formData.articular_involvement}
          options={options.articular_involvement_options || []}
          onChange={(value) => onUpdate({ ...formData, articular_involvement: value as ArticularInvolvement })}
        />
      )}

      {showArticularInvolvementYesNo && (
        <QuestionStep
          question={{
            id: 'articular_involvement',
            title: options.questions.articular_involvement_medial?.title || 'Is there significant articular involvement with metaphyseal extension?',
          }}
          value={formData.articular_involvement === 'large_with_extension' ? 'true' : formData.articular_involvement === 'small_without_extension' ? 'false' : undefined}
          options={yesNoOptions}
          onChange={(value) => onUpdate({ ...formData, articular_involvement: (value === 'true' ? 'large_with_extension' : 'small_without_extension') as ArticularInvolvement })}
        />
      )}

      {showArticularDepression && (
        <QuestionStep
          question={{
            id: 'has_articular_depression',
            title: (formData.involved_malleoli === 'medial_only'
              ? options.questions.has_articular_depression_medial?.title
              : options.questions.has_articular_depression?.title) || 'Is articular depression present?',
          }}
          value={formData.has_articular_depression?.toString()}
          options={yesNoOptions}
          onChange={(value) => onUpdate({ ...formData, has_articular_depression: value === 'true' })}
        />
      )}

      {showMedialMorphology && (
        <QuestionStep
          question={{
            id: 'medial_morphology',
            title: (formData.involved_malleoli === 'lateral_medial'
              ? options.questions.medial_morphology_lm?.title
              : options.questions.medial_morphology?.title) || 'Medial fracture morphology?',
          }}
          value={formData.medial_morphology}
          options={
            formData.involved_malleoli === 'lateral_medial'
              ? (options.medial_morphology_lm || [])
              : (options.medial_morphology || [])
          }
          onChange={(value) => onUpdate({ ...formData, medial_morphology: value as MedialMorphology })}
        />
      )}

      {showBimaleolarInfraQuestion && (
        <QuestionStep
          question={{
            id: 'fibula_infrasindesmal_transverse',
            title: options.questions.fibula_infrasindesmal_transverse?.title || 'Is fibula fracture infrasindesmal AND transverse?',
          }}
          value={formData.fibula_infrasindesmal_transverse?.toString()}
          options={yesNoOptions}
          onChange={(value) => onUpdate({ ...formData, fibula_infrasindesmal_transverse: value === 'true' })}
        />
      )}

      {showFibularLevel && (
        <QuestionStep
          question={{
            id: 'fibular_level',
            title: (
              ['lateral_medial', 'lateral_posterior', 'trimaleolar'].includes(formData.involved_malleoli || '')
                ? options.questions.fibular_level_lm?.title
                : options.questions.fibular_level?.title
            ) || 'Fibular fracture level?',
          }}
          value={formData.fibular_level}
          options={
            ['trimaleolar', 'lateral_medial'].includes(formData.involved_malleoli || '')
              ? (options.fibular_levels_tri || options.fibular_levels || [])
              : (options.fibular_levels || [])
          }
          onChange={(value) => onUpdate({ ...formData, fibular_level: value as FibularLevel })}
        />
      )}

      {showLateralMorphology && !showSuprasindesmalType && (
        <QuestionStep
          question={{
            id: 'lateral_morphology',
            title: (['lateral_medial', 'trimaleolar'].includes(formData.involved_malleoli || '')
              ? options.questions.lateral_morphology_lm_tri?.title
              : options.questions.lateral_morphology?.title) || 'Lateral fracture morphology?',
          }}
          value={formData.lateral_morphology}
          options={
            formData.involved_malleoli === 'lateral_medial'
              ? (options.fibula_morphology_lm || [])
              : formData.involved_malleoli === 'trimaleolar'
                ? (options.fibula_morphology_tri || [])
                : (options.lateral_morphology || [])
          }
          onChange={(value) => onUpdate({ ...formData, lateral_morphology: value as LateralMorphology })}
        />
      )}

      {showInfrasindesmalMorphology && (
        <QuestionStep
          question={{
            id: 'infrasindesmal_morphology',
            title: (['lateral_medial', 'trimaleolar'].includes(formData.involved_malleoli || '')
              ? options.questions.infrasindesmal_morphology_lm_tri?.title
              : options.questions.infrasindesmal_morphology?.title) || 'Infrasyndesmal fracture morphology?',
          }}
          value={formData.infrasindesmal_morphology}
          options={['lateral_medial', 'trimaleolar'].includes(formData.involved_malleoli || '')
            ? (options.infrasindesmal_morphology_lm_tri || [])
            : (options.infrasindesmal_morphology || [])}
          onChange={(value) => onUpdate({ ...formData, infrasindesmal_morphology: value as LateralSubtype })}
        />
      )}

      {showLateralSubtype && (
        <QuestionStep
          question={{
            id: 'lateral_subtype',
            title: options.questions.lateral_subtype?.title || 'Lateral fracture type?',
          }}
          value={formData.lateral_subtype}
          options={options.lateral_subtype || []}
          onChange={(value) => onUpdate({ ...formData, lateral_subtype: value as LateralSubtype })}
        />
      )}

      {showSuprasindesmalType && (
        <QuestionStep
          question={{
            id: 'suprasindesmal_type',
            title: options.questions.suprasindesmal_type?.title || 'Suprasindesmotic fracture type?',
          }}
          value={formData.suprasindesmal_type}
          options={formData.involved_malleoli === 'lateral_posterior'
            ? (options.suprasindesmal_types_lp || options.suprasindesmal_types || [])
            : (options.suprasindesmal_types || [])}
          onChange={(value) => onUpdate({ ...formData, suprasindesmal_type: value as SuprasindesmalType })}
        />
      )}

      {showFibulaTracePattern && (
        <QuestionStep
          question={{
            id: 'fibula_trace_pattern',
            title: (formData.involved_malleoli === 'lateral_posterior'
              ? (formData.suprasindesmal_type === 'multifragmentary'
                ? options.questions.fibula_trace_pattern_multi?.title
                : options.questions.fibula_trace_pattern_lp?.title)
              : (formData.suprasindesmal_type === 'multifragmentary'
                ? options.questions.fibula_trace_pattern_multi?.title
                : options.questions.fibula_trace_pattern?.title)) || 'Fibula trace pattern?',
          }}
          value={formData.fibula_trace_pattern}
          options={formData.involved_malleoli === 'lateral_posterior'
            ? (formData.suprasindesmal_type === 'multifragmentary'
              ? (options.fibula_trace_patterns_multi_lp || options.fibula_trace_patterns || [])
              : (options.fibula_trace_patterns_lp || options.fibula_trace_patterns || []))
            : (formData.suprasindesmal_type === 'multifragmentary'
              ? (options.fibula_trace_patterns_multi_lp || options.fibula_trace_patterns || [])
              : (options.fibula_trace_patterns || []))}
          onChange={(value) => onUpdate({ ...formData, fibula_trace_pattern: value as FibulaTracePattern })}
        />
      )}

      {showMedialSubtype && (
        <QuestionStep
          question={{
            id: 'medial_subtype',
            title: options.questions.medial_subtype?.title || 'Medial malleolus type?',
          }}
          value={formData.medial_subtype}
          options={options.medial_subtype || []}
          onChange={(value) => onUpdate({ ...formData, medial_subtype: value as MedialSubtype })}
        />
      )}

      {showFibulaHeadShortening && (
        <QuestionStep
          question={{
            id: 'has_fibula_head_shortening',
            title: options.questions.has_fibula_head_shortening?.title || 'Is there fibula head shortening?',
          }}
          value={formData.has_fibula_head_shortening?.toString()}
          options={yesNoOptions}
          onChange={(value) => onUpdate({ ...formData, has_fibula_head_shortening: value === 'true' })}
        />
      )}

      {showCTScan && (
        <QuestionStep
          question={{
            id: 'has_ct_scan',
            title: options.questions.has_ct_scan?.title || 'Do you have a CT scan?',
          }}
          value={formData.has_ct_scan?.toString()}
          options={yesNoOptions}
          onChange={(value) => onUpdate({ ...formData, has_ct_scan: value === 'true', posterior_fracture_type: undefined })}
        />
      )}

      {showPosteriorType && (
        <QuestionStep
          question={{
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
          }}
          value={formData.posterior_fracture_type}
          options={
            formData.involved_malleoli === 'medial_posterior'
              ? (options.posterior_fracture_types_medial_posterior || [])
              : formData.involved_malleoli === 'lateral_posterior' && formData.fibular_level === 'infrasindesmal'
                ? (options.posterior_fracture_types_lp_infra || options.posterior_fracture_types || [])
                : (options.posterior_fracture_types || [])
          }
          onChange={(value) => onUpdate({ ...formData, posterior_fracture_type: value as PosteriorFractureType })}
        />
      )}

      <div ref={formEndRef} />
    </>
  );
}
