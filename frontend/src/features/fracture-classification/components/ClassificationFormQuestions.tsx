import { useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getLocalFormOptions } from '@/utils/formOptions';
import type { FractureInput } from '@/types';
import { getQuestionSteps } from '../utils/questionSteps';
import { QuestionStep } from './QuestionStep';

interface ClassificationFormQuestionsProps {
  formData: Partial<FractureInput>;
  onUpdate: (newData: Partial<FractureInput>) => void;
  /** When set (true/false), has_ct_scan is auto-set and CT question is skipped */
  hasTACImages?: boolean;
}

/**
 * Maps each question field to all fields that could appear after it in any
 * decision-tree path. When a question answer changes, all its downstream
 * fields are cleared so stale answers from a previous path don't persist.
 */
const DOWNSTREAM_FIELDS: Record<string, (keyof FractureInput)[]> = {
  articular_involvement: [
    'has_articular_depression', 'medial_morphology', 'fibula_infrasindesmal_transverse',
    'fibular_level', 'fibula_trace_count', 'lateral_morphology', 'infrasindesmal_morphology', 'lateral_subtype',
    'suprasindesmal_type', 'fibula_trace_pattern', 'medial_subtype',
    'has_fibula_head_shortening', 'has_ct_scan', 'posterior_fracture_type',
  ],
  has_articular_depression: [],
  medial_morphology: [
    'fibula_infrasindesmal_transverse', 'fibular_level', 'fibula_trace_count', 'lateral_morphology',
    'infrasindesmal_morphology', 'lateral_subtype', 'suprasindesmal_type',
    'fibula_trace_pattern', 'medial_subtype', 'has_fibula_head_shortening',
    'has_ct_scan', 'posterior_fracture_type',
  ],
  fibula_infrasindesmal_transverse: [
    'fibular_level', 'fibula_trace_count', 'lateral_morphology', 'infrasindesmal_morphology', 'lateral_subtype',
    'suprasindesmal_type', 'fibula_trace_pattern', 'medial_subtype',
    'has_fibula_head_shortening', 'has_ct_scan', 'posterior_fracture_type',
  ],
  fibular_level: [
    'fibula_trace_count', 'lateral_morphology', 'infrasindesmal_morphology', 'lateral_subtype',
    'suprasindesmal_type', 'fibula_trace_pattern', 'medial_subtype',
    'has_fibula_head_shortening', 'has_ct_scan', 'posterior_fracture_type',
  ],
  fibula_trace_count: [
    'lateral_morphology', 'lateral_subtype', 'medial_subtype',
    'has_ct_scan', 'posterior_fracture_type',
  ],
  lateral_morphology: [
    'lateral_subtype', 'medial_subtype', 'has_ct_scan', 'posterior_fracture_type',
  ],
  infrasindesmal_morphology: ['has_ct_scan', 'posterior_fracture_type'],
  lateral_subtype: [],
  suprasindesmal_type: [
    'fibula_trace_pattern', 'medial_subtype', 'has_fibula_head_shortening',
    'has_ct_scan', 'posterior_fracture_type',
  ],
  fibula_trace_pattern: ['medial_subtype', 'has_ct_scan', 'posterior_fracture_type'],
  medial_subtype: ['has_ct_scan', 'posterior_fracture_type'],
  has_fibula_head_shortening: [],
  has_ct_scan: ['posterior_fracture_type'],
  posterior_fracture_type: [],
};

/** Returns a copy of formData with all downstream fields of `changedField` removed. */
function clearDownstream(
  formData: Partial<FractureInput>,
  changedField: string,
): Partial<FractureInput> {
  const toClear = DOWNSTREAM_FIELDS[changedField];
  if (!toClear || toClear.length === 0) return { ...formData };
  const cleaned = { ...formData };
  for (const field of toClear) {
    delete cleaned[field];
  }
  return cleaned;
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
  hasTACImages,
}: ClassificationFormQuestionsProps) {
  const { i18n } = useTranslation();
  const formEndRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const options = useMemo(() => getLocalFormOptions(), [i18n.language]);

  // Wrap onUpdate to always re-apply has_ct_scan when hasTACImages is defined.
  // clearDownstream removes has_ct_scan when upstream fields change, but when
  // TAC images are present the value must persist throughout the form.
  const handleUpdate = (newData: Partial<FractureInput>) => {
    onUpdate({
      ...newData,
      ...(hasTACImages !== undefined ? { has_ct_scan: hasTACImages } : {}),
    });
  };

  // Auto-scroll when form data changes
  useEffect(() => {
    if (Object.keys(formData).length > 0 && formEndRef.current) {
      const timer = setTimeout(() => {
        formEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [formData]);

  const steps = getQuestionSteps(formData, options, hasTACImages);

  return (
    <>
      {steps.map((step) => (
        <QuestionStep
          key={step.id}
          question={{ id: step.id, title: step.title }}
          value={step.value}
          options={step.options}
          onChange={(value) => handleUpdate({
            // Changing the first question restarts the path.
            ...(step.id === 'involved_malleoli' ? {} : clearDownstream(formData, step.id)),
            ...step.toPatch(value),
          })}
        />
      ))}

      <div ref={formEndRef} />
    </>
  );
}
