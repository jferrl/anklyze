// Maléolos fracturados (primera pregunta - selección única)
export type InvolvedMalleoli =
  | 'posterior_only'        // Maléolo posterior
  | 'medial_only'           // Maléolo medial
  | 'lateral_only'          // Maléolo lateral
  | 'medial_posterior'      // Maléolos medial y posterior
  | 'lateral_posterior'     // Maléolos lateral y posterior
  | 'lateral_medial'        // Maléolos lateral y medial
  | 'trimaleolar';          // Maléolos medial, lateral y posterior

// Tipo de fractura del maléolo posterior (Bartonicek)
export type PosteriorFractureType =
  | 'extraincisural'              // Fragmento extraincisural (Bartonicek 1)
  | 'posterolateral'              // Fragmento posterolateral (Bartonicek 2)
  | 'posteromedial_posterolateral' // Fragmento posteromedial y posterolateral (Bartonicek 3)
  | 'large_posterolateral';       // Gran fragmento triangular posterolateral (Bartonicek 4)

// Morfología del maléolo medial
export type MedialMorphology =
  | 'oblique'    // Oblicuo
  | 'transverse'; // Transverso

// Nivel de fractura del peroné
export type FibularLevel =
  | 'infrasindesmal'  // Infrasindesmal
  | 'transindesmal'   // Transindesmal
  | 'suprasindesmal'; // Suprasindesmal

// Morfología de fractura lateral/peroné
export type LateralMorphology =
  | 'transverse' // Transversa
  | 'oblique'    // Oblicua (Baja medial, alta lateral)
  | 'spiral';    // Espiroidea (Baja anterior, alta posterior)

// Tipo de fractura suprasindesmal (Weber C)
export type SuprasindesmalType =
  | 'simple_diaphyseal' // Diafisaria Simple
  | 'multifragmentary'  // Multifragmentaria
  | 'proximal';         // Proximal

// Input para clasificación
export interface FractureInput {
  // Pregunta 1: ¿Qué maléolos tiene fracturados?
  involved_malleoli: InvolvedMalleoli;

  // Para maléolo posterior: tipo de fractura (Bartonicek)
  posterior_fracture_type?: PosteriorFractureType;

  // Para maléolo medial: morfología
  medial_morphology?: MedialMorphology;

  // Para maléolo lateral: nivel de fractura
  fibular_level?: FibularLevel;

  // Para maléolo lateral: morfología
  lateral_morphology?: LateralMorphology;

  // Para suprasindesmal: tipo de fractura
  suprasindesmal_type?: SuprasindesmalType;

  // Para bimaleolar lateral+medial: ¿fractura peroné infrasindesmal y transversa?
  fibula_infrasindesmal_transverse?: boolean;

  // Para bimaleolar lateral+medial con morfología transversa: nivel del peroné
  fibular_level_for_transverse?: FibularLevel;
}

// Danis-Weber classification result
export interface DanisWeberClassification {
  type: string;
  description: string;
}

// Lauge-Hansen type
export type LaugeHansenType = 'SA' | 'SER' | 'PER' | 'PA';

// Lauge-Hansen classification result
export interface LaugeHansenClassification {
  type: string;
  full_name: string;
  description: string;
  ambiguous?: boolean;
  possible_types?: string[];
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
export interface ClassificationResult {
  fracture_description: string;
  danis_weber?: DanisWeberClassification;
  lauge_hansen?: LaugeHansenClassification;
  ao_ota?: AOOTAClassification;
  bartonicek?: BartonicekClassification;
  notes?: string[];
  impossible?: boolean;
  impossible_reason?: string;
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
  description?: string;
}

// All form options
export interface FormOptions {
  questions: Record<string, Question>;
  involved_malleoli: SelectOption[];
  posterior_fracture_types: SelectOption[];
  medial_morphology: SelectOption[];
  fibular_levels: SelectOption[];
  lateral_morphology: SelectOption[];
  suprasindesmal_types: SelectOption[];
  labels: Record<string, string>;
}
