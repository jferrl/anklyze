// Question 1: Medial malleolus morphology
export type MedialMorphology = 'none' | 'oblique' | 'transverse';

// Question 2: Fibular fracture level
export type FibularLevel = 'suprasindesmal_high' | 'transindesmal' | 'infrasindesmal' | 'doubtful';

// Question 3: Fibular morphology
export type FibularMorphology = 'transverse' | 'transverse_oblique' | 'spiral';

// Question 4: SER fragments
export type SERFragment = 'none' | 'wagstaffe' | 'tillaux_chaput';

// Question 5a: Fracture involvement (for Weber A/B)
export type FractureInvolvement = 'lateral_only' | 'lateral_medial' | 'lateral_medial_posterior';

// Question 5b: Weber C fracture type (for Weber C)
export type WeberCFractureType = 'simple' | 'multifragmentary' | 'proximal';

// Input for classification
export interface FractureInput {
  medial_morphology: MedialMorphology;
  fibular_level?: FibularLevel;
  fibular_morphology?: FibularMorphology;
  ser_fragment?: SERFragment;
  fracture_involvement?: FractureInvolvement;
  weber_c_fracture_type?: WeberCFractureType;
}

// Danis-Weber classification result
export interface DanisWeberClassification {
  type: string;
  description: string;
}

// Lauge-Hansen classification result
export interface LaugeHansenClassification {
  type: string;
  full_name: string;
  description: string;
  fragment?: string;
}

// AO/OTA classification result
export interface AOOTAClassification {
  code: string;
  description: string;
}

// Combined classification result
export interface ClassificationResult {
  danis_weber: DanisWeberClassification;
  lauge_hansen: LaugeHansenClassification;
  ao_ota: AOOTAClassification;
  notes?: string[];
}

// Form option
export interface SelectOption {
  value: string;
  label: string;
}

// All form options
export interface FormOptions {
  medial_morphology: SelectOption[];
  fibular_levels: SelectOption[];
  fibular_morphology: SelectOption[];
  ser_fragments: SelectOption[];
  fracture_involvement: SelectOption[];
  weber_c_fracture_type: SelectOption[];
}
