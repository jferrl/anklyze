import { isFormComplete } from '@/features/fracture-classification/utils/formValidation';
import type {
  ArticularInvolvement,
  FibulaTraceCount,
  FractureInput,
  InvolvedMalleoli,
  LateralMorphology,
  LateralSubtype,
  MedialMorphology,
  MedialSubtype,
  PosteriorFractureType,
  SuprasindesmalType,
} from '@/types';

/**
 * FibulaMark is where AnatomyView marks the fibular fracture: below, at or above the syndesmosis,
 * more than 6 cm above the joint, or in the proximal fibula (outside the drawing).
 */
export type FibulaMark = 'infra' | 'trans' | 'supra' | 'supra_far' | 'proximal';

/** AnatomyState is what the anatomy drawing shows for a set of answers. */
export interface AnatomyState {
  lateral: boolean;
  medial: boolean;
  posterior: boolean;
  fibula?: FibulaMark;
  posteriorType?: PosteriorFractureType;
  // Copied answers the fracture pose reads.
  suprasindesmalType?: SuprasindesmalType;
  lateralMorphology?: LateralMorphology;
  traceCount?: FibulaTraceCount;
  lateralSubtype?: LateralSubtype;
  infraMorphology?: LateralSubtype;
  medialMorphology?: MedialMorphology;
  medialSubtype?: MedialSubtype;
  articularInvolvement?: ArticularInvolvement;
  articularDepression?: boolean;
  posteriorPosteromedial?: boolean;
  /** complete is true once the form can be classified. */
  complete: boolean;
}

const LATERAL: InvolvedMalleoli[] = ['lateral_only', 'lateral_posterior', 'lateral_medial', 'trimaleolar'];
const MEDIAL: InvolvedMalleoli[] = ['medial_only', 'medial_posterior', 'lateral_medial', 'trimaleolar'];
const POSTERIOR: InvolvedMalleoli[] = ['posterior_only', 'medial_posterior', 'lateral_posterior', 'trimaleolar'];

/** getAnatomyState maps form answers to the structures and fibular level the drawing highlights. */
export function getAnatomyState(form: Partial<FractureInput>): AnatomyState {
  const m = form.involved_malleoli;
  const fibula = m && LATERAL.includes(m) ? fibulaMark(form) : undefined;
  return {
    // A proximal (Maisonneuve) fibular fracture leaves the lateral malleolus itself intact.
    lateral: !!m && LATERAL.includes(m) && fibula !== 'proximal',
    medial: !!m && MEDIAL.includes(m),
    posterior: !!m && POSTERIOR.includes(m),
    fibula,
    posteriorType: form.posterior_fracture_type,
    suprasindesmalType: form.suprasindesmal_type,
    lateralMorphology: form.lateral_morphology,
    traceCount: form.fibula_trace_count,
    lateralSubtype: form.lateral_subtype,
    infraMorphology: form.infrasindesmal_morphology,
    medialMorphology: form.medial_morphology,
    medialSubtype: form.medial_subtype,
    articularInvolvement: form.articular_involvement,
    articularDepression: form.has_articular_depression,
    posteriorPosteromedial: form.is_posterior_posteromedial,
    complete: isFormComplete(form),
  };
}

function fibulaMark(form: Partial<FractureInput>): FibulaMark | undefined {
  switch (form.fibular_level) {
    case 'infrasindesmal':
      return 'infra';
    case 'transindesmal':
      return 'trans';
    case 'suprasindesmal':
      if (form.suprasindesmal_type === 'proximal') return 'proximal';
      return form.fibula_trace_pattern === 'suprasindesmotic_far' ? 'supra_far' : 'supra';
  }
  // Lateral and medial with a vertical medial fracture: "yes" to an infrasyndesmotic fibula ends the level question.
  return form.fibula_infrasindesmal_transverse === true ? 'infra' : undefined;
}
