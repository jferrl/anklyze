/**
 * Test data for all classification paths
 * Each path contains the expected results for verification
 */

export const PosteriorTypes = {
  EXTRAINCISURAL: 'extraincisural',
  POSTEROLATERAL: 'posterolateral',
  POSTEROMEDIAL_POSTEROLATERAL: 'posteromedial_posterolateral',
  LARGE_POSTEROLATERAL: 'large_posterolateral',
} as const;

export const MedialMorphology = {
  OBLIQUE: 'oblique',
  TRANSVERSE: 'transverse',
} as const;

export const FibularLevel = {
  INFRASINDESMAL: 'infrasindesmal',
  TRANSINDESMAL: 'transindesmal',
  SUPRASINDESMAL: 'suprasindesmal',
} as const;

export const LateralMorphology = {
  TRANSVERSE: 'transverse',
  OBLIQUE: 'oblique',
  SPIRAL: 'spiral',
} as const;

export const SuprasindesmalType = {
  SIMPLE_DIAPHYSEAL: 'simple_diaphyseal',
  MULTIFRAGMENTARY: 'multifragmentary',
  PROXIMAL: 'proximal',
} as const;

/**
 * Expected classification results for different scenarios
 */
export const ExpectedResults = {
  // Posterior only path - Bartonicek classifications
  posteriorOnly: {
    extraincisural: { bartonicek: '1' },
    posterolateral: { bartonicek: '2' },
    posteromedialPosterolateral: { bartonicek: '3' },
    largePosterolateral: { bartonicek: '4' },
  },

  // Medial only path - Lauge-Hansen classifications
  medialOnly: {
    oblique: { laugeHansen: 'PA' },
    transverse: { laugeHansen: 'SA' },
  },

  // Lateral only path - Multiple classification systems
  lateralOnly: {
    infraTransverse: { laugeHansen: 'SA', danisWeber: 'A' },
    infraOblique: { laugeHansen: 'SA', danisWeber: 'A' },
    transSpiral: { laugeHansen: 'SER', danisWeber: 'B' },
    transOblique: { laugeHansen: 'PA', danisWeber: 'B' },
    supraSimple: { laugeHansen: 'PER', danisWeber: 'C' },
    supraMultifragmentary: { laugeHansen: 'PER', danisWeber: 'C' },
    supraProximal: { laugeHansen: 'PER', danisWeber: 'C' },
  },

  // Medial + Posterior - Direct result
  medialPosterior: {
    default: { laugeHansen: 'PA' },
  },

  // Lateral + Posterior path
  lateralPosterior: {
    infraTransverse: { notPossible: true },
    infraOblique: { laugeHansen: 'SA', danisWeber: 'A' },
    transSpiral: { laugeHansen: 'SER', danisWeber: 'B' },
    transOblique: { laugeHansen: 'PA', danisWeber: 'B' },
    supra: { laugeHansen: 'PER', danisWeber: 'C' },
  },

  // Lateral + Medial path
  lateralMedial: {
    obliqueYesInfraTransverse: { laugeHansen: 'SA', danisWeber: 'A' },
    obliqueNoSupra: { laugeHansen: 'PER', danisWeber: 'C' },
    transverseSupra: { laugeHansen: 'PER', danisWeber: 'C' },
    transverseLowOblique: { laugeHansen: 'SER', danisWeber: 'B' },
    transverseLowSpiral: { laugeHansen: 'SER', danisWeber: 'B' },
  },

  // Trimaleolar path
  trimaleolar: {
    highSimple: { laugeHansen: 'PER', danisWeber: 'C' },
    highMultifragmentary: { laugeHansen: 'PER', danisWeber: 'C' },
    highProximal: { laugeHansen: 'PER', danisWeber: 'C' },
    lowOblique: { laugeHansen: 'SER', danisWeber: 'B' },
    lowSpiral: { laugeHansen: 'SER', danisWeber: 'B' },
    lowTransverseInfra: { notPossible: true },
    lowTransverseTrans: { laugeHansen: 'SER', danisWeber: 'B' },
  },
};

/**
 * Language-specific text for assertions
 */
export const LanguageText = {
  en: {
    appTitle: 'Ankle Fracture Classification',
    classify: 'Classify Fracture',
    classifyAnother: 'Classify Another',
    loading: 'Loading',
    startClassifying: 'Start Classifying',
  },
  es: {
    appTitle: 'Clasificación de Fracturas de Tobillo',
    classify: 'Clasificar Fractura',
    classifyAnother: 'Clasificar Otra',
    loading: 'Cargando',
    startClassifying: 'Comenzar',
  },
};
