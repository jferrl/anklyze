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

// Patrón de trazo del peroné (para suprasindesmal simple/multifragmentaria)
export type FibulaTracePattern =
  | 'parasindesmotic_short' // Parasindesmal de trazo oblicuo corto/transverso/conminuto
  | 'parasindesmotic_long'; // Parasindesmal o suprasindesmal de trazo oblicuo largo/espiroideo

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

  // ¿Tiene TAC? (para clasificación Bartonicek)
  has_ct_scan?: boolean;

  // Patrón de trazo del peroné (para suprasindesmal simple/multifragmentaria)
  fibula_trace_pattern?: FibulaTracePattern;
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

// Comparison scenario for side-by-side comparison
export interface ComparisonScenario {
  id: string;
  input: FractureInput;
  result: ClassificationResult;
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
  fibula_trace_patterns: SelectOption[];
  labels: Record<string, string>;
}

// Chat types
export type ChatStatus = 'complete' | 'needs_clarification' | 'error';

export interface Clarification {
  field: string;
  question: string;
  options?: string[];
}

export interface ChatRequest {
  message: string;
  language: string;
  session_id?: string;
}

export interface ChatResponse {
  status: ChatStatus;
  extracted_input?: FractureInput;
  classification?: ClassificationResult;
  confidence: number;
  missing_fields?: string[];
  clarifications?: Clarification[];
  message: string;
}

// Chat session types
export interface ChatSessionResponse {
  session_id: string;
}

// Feedback types
export type FeedbackRating = 'positive' | 'negative';

export interface FeedbackRequest {
  rating: FeedbackRating;
  comment?: string;
}

// Analytics types
export interface TimePeriod {
  from: string;
  to: string;
}

export interface ChatAnalyticsSummary {
  period: TimePeriod;
  total_sessions: number;
  completed_sessions: number;
  abandoned_sessions: number;
  completion_rate: number;
  avg_messages_per_session: number;
  avg_clarifications_per_session: number;
  avg_confidence: number;
  avg_session_duration_ms: number;
  language_distribution: Record<string, number>;
  classification_distribution: Record<string, number>;
}

export interface ChatFeedbackSummary {
  period: TimePeriod;
  total_feedback: number;
  positive_count: number;
  negative_count: number;
  positive_rate: number;
  feedback_with_comment: number;
}

export interface ConfidenceBucket {
  range: string;
  count: number;
  percentage: number;
}

export interface ConfidenceDistribution {
  period: TimePeriod;
  total: number;
  distribution: ConfidenceBucket[];
}
