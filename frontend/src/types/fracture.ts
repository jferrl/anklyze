// Medial morphology (for complex path with medial + lateral)
export type MedialMorphology = 'oblique_vertical' | 'transverse' | 'doubtful';

// Fibular level
export type FibularLevel = 'infrasindesmal' | 'transindesmal' | 'suprasindesmal_high' | 'doubtful';

// Fibular morphology
export type FibularMorphology = 'transverse' | 'oblique' | 'spiral';

// Weber C fracture type (for suprasindesmal)
export type WeberCFractureType = 'simple_diaphyseal' | 'multifragmentary' | 'proximal';

// Involved malleoli (for SA/transverse pattern)
export type InvolvedMalleoliSA = 'unifocal' | 'bifocal' | 'trifocal';

// Involved malleoli (for SER/spiral pattern)
export type InvolvedMalleoliSER = 'lateral_only' | 'lateral_medial' | 'lateral_medial_posterior';

// Combined involved malleoli type
export type InvolvedMalleoli = InvolvedMalleoliSA | InvolvedMalleoliSER;

// Bartonicek type (for posterior malleolus)
export type BartonicekType = 'type_1' | 'type_2' | 'type_3' | 'type_4';

// Input for classification
export interface FractureInput {
  // Step 1: Which malleoli are fractured?
  has_medial_fracture: boolean;
  has_lateral_fracture: boolean;
  has_posterior_fracture: boolean;

  // For posterior-only path
  posterior_fracture_type?: BartonicekType;

  // For lateral-only path
  lateral_fracture_level?: FibularLevel;

  // For lateral-only suprasindesmal
  suprasindesmal_type?: WeberCFractureType;

  // For complex path (medial + lateral)
  medial_morphology?: MedialMorphology;

  // For oblique/vertical medial: Is fibula transverse?
  fibula_transverse?: boolean;

  // Fibular level (for complex paths)
  fibular_level?: FibularLevel;

  // For infrasindesmal: Is it transverse?
  fibular_transverse?: boolean;

  // Fibular morphology
  fibular_morphology?: FibularMorphology;

  // For oblique fibula: At what level?
  oblique_fibular_level?: FibularLevel;

  // Involved malleoli (for final AO classification)
  involved_malleoli?: InvolvedMalleoli;

  // Posterior fracture type (Bartonicek) when posterior is involved
  posterior_type?: BartonicekType;
}

// Danis-Weber classification result
export interface DanisWeberClassification {
  type: string;
  description: string;
}

// Lauge-Hansen type
export type LaugeHansenType = 'SA' | 'SER' | 'PER' | 'PA' | 'PER or PA';

// Lauge-Hansen classification result
export interface LaugeHansenClassification {
  type: string;
  full_name: string;
  description: string;
  possible_types?: LaugeHansenType[]; // Alternative types when classification is ambiguous
}

// AO/OTA classification result
export interface AOOTAClassification {
  code: string;
  description: string;
}

// Bartonicek classification result
export interface BartonicekClassification {
  type: string;
  description: string;
}

// Combined classification result
// Note: Some classifications may be undefined depending on fracture type
export interface ClassificationResult {
  danis_weber?: DanisWeberClassification;
  lauge_hansen?: LaugeHansenClassification;
  ao_ota?: AOOTAClassification;
  bartonicek?: BartonicekClassification;
  notes?: string[];
}

// Form option
export interface SelectOption {
  value: string;
  label: string;
}

// Question from backend
export interface Question {
  id: string;
  title: string;
  description: string;
}

// All form options
export interface FormOptions {
  questions: Record<string, Question>;
  labels: Record<string, string>;
  medial_morphology: SelectOption[];
  fibular_levels: SelectOption[];
  fibular_morphology: SelectOption[];
  weber_c_fracture_type: SelectOption[];
  involved_malleoli_sa: SelectOption[];
  involved_malleoli_ser: SelectOption[];
  bartonicek_types: SelectOption[];
}
