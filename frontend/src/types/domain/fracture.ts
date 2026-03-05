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
  | 'large_posterolateral'        // Gran fragmento triangular posterolateral (Bartonicek 4)
  | 'extraincisural_posteromedial'; // Fragmento extraincisural postero-medial (medial+posterior path only)

// Morfología del maléolo medial
export type MedialMorphology =
  | 'vertical'           // Vertical
  | 'transverse_oblique'; // Transverso/oblicuo

// Nivel de fractura del peroné
export type FibularLevel =
  | 'infrasindesmal'  // Infrasindesmal
  | 'transindesmal'   // Transindesmal
  | 'suprasindesmal'; // Suprasindesmal

// Morfología de fractura lateral/peroné
export type LateralMorphology =
  | 'transverse' // Transversa
  | 'oblique'    // Oblicua (Baja medial, alta lateral)
  | 'spiral'     // Espiroidea (Baja anterior, alta posterior)
  | 'conminuta'; // Conminuta

// Subtipo lateral para transindesmal lateral-only
export type LateralSubtype =
  | 'simple'              // Simple
  | 'syndesmosis_rupture' // Rotura sindesmosis
  | 'butterfly'           // Ala de mariposa / cuña
  | 'avulsion'            // Avulsión punta peroné
  | 'malleolus_fracture'; // Fractura maléolo

// Subtipo medial para bimalleolar
export type MedialSubtype =
  | 'open_mortise'       // Abierta mortaja
  | 'malleolus_fracture'; // Fractura maléolo

// Tipo de fractura suprasindesmal (Weber C)
export type SuprasindesmalType =
  | 'simple_diaphyseal' // Diafisaria Simple
  | 'multifragmentary'  // Multifragmentaria
  | 'proximal';         // Proximal

// Patrón de trazo del peroné (para suprasindesmal simple/multifragmentaria)
export type FibulaTracePattern =
  | 'parasindesmotic_short' // Parasindesmal de trazo oblicuo corto/transverso/conminuto
  | 'parasindesmotic_long'  // Parasindesmal de trazo oblicuo largo/espiroideo
  | 'suprasindesmotic_far'; // Suprasindesmal (>6cm de superficie articular) → PER mechanism

// Articular surface involvement for posterior-only and medial-only paths
export type ArticularInvolvement =
  | 'large_with_extension'    // >1/3 with metaphyseal extension
  | 'small_without_extension'; // <1/3 without metaphyseal extension

// Input para clasificación - características de la fractura
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

  // Articular surface involvement for posterior-only and medial-only paths
  articular_involvement?: ArticularInvolvement;

  // Whether articular depression is present (when articular_involvement = large_with_extension)
  has_articular_depression?: boolean;

  // Whether posterior fragment is posteromedial (lateral+posterior infrasindesmal + CT path)
  is_posterior_posteromedial?: boolean;

  // Lateral subtype for transindesmal lateral-only paths
  lateral_subtype?: LateralSubtype;

  // Infrasindesmal morphology subtype (avulsion, malleolus_fracture)
  infrasindesmal_morphology?: LateralSubtype;

  // Medial subtype for bimalleolar paths
  medial_subtype?: MedialSubtype;

  // Whether fibula head shortening is present (proximal/Maisonneuve path)
  has_fibula_head_shortening?: boolean;
}

// Lauge-Hansen type
export type LaugeHansenType = 'SA' | 'SER' | 'PER' | 'PA';

// Danis-Weber classification result
export interface DanisWeberClassification {
  type: string;
}

// Lauge-Hansen classification result
export interface LaugeHansenClassification {
  type: string;
  ambiguous?: boolean;
  ambiguous_reason_key?: string;
  possible_types?: string[];
}

// AO/OTA classification result
export interface AOOTAClassification {
  code: string;
}

// Bartonicek classification result
export interface BartonicekClassification {
  type: string;
}

// Combined classification result
export interface ClassificationResult {
  fracture_type: string;
  danis_weber?: DanisWeberClassification;
  lauge_hansen?: LaugeHansenClassification;
  ao_ota?: AOOTAClassification;
  bartonicek?: BartonicekClassification;
  notes?: string[];
  impossible?: boolean;
  impossible_key?: string;
}

// Comparison scenario for side-by-side comparison
export interface ComparisonScenario {
  id: string;
  input: FractureInput;
  result: ClassificationResult;
}
