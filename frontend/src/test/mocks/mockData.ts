import type {
  FractureInput,
  ClassificationResult,
  DanisWeberClassification,
  LaugeHansenClassification,
  AOOTAClassification,
  BartonicekClassification,
} from '@/types/domain/fracture'
import type {
  ClassifyFractureRequest,
  ClassifyFractureResponse,
} from '@/types/api/classification'
import type {
  ChatRequest,
  ChatResponse,
  ChatSessionResponse,
} from '@/types/api/chat'
import type {
  Case,
  CaseImage,
  CaseWithImages,
  UserCaseItem,
  UserCaseDetail,
  CaseResponse,
  UserProfile,
  CaseAnalyticsSummary,
  ReliabilityMetrics,
} from '@/types/domain/case'

// ============================================================================
// Fracture Classification Mock Data
// ============================================================================

/**
 * Complete fracture input for a lateral malleolus fracture (Weber B, SER)
 */
export const mockFractureInput: FractureInput = {
  involved_malleoli: 'lateral_only',
  fibular_level: 'transindesmal',
  lateral_morphology: 'oblique',
}

/**
 * Complete fracture input for a bimalleolar fracture
 */
export const mockBimalleolarInput: FractureInput = {
  involved_malleoli: 'lateral_medial',
  fibular_level: 'transindesmal',
  lateral_morphology: 'spiral',
  medial_morphology: 'transverse',
}

/**
 * Complete fracture input for a trimalleolar fracture
 */
export const mockTrimalleolarInput: FractureInput = {
  involved_malleoli: 'trimaleolar',
  fibular_level: 'suprasindesmal',
  lateral_morphology: 'spiral',
  medial_morphology: 'transverse',
  suprasindesmal_type: 'simple_diaphyseal',
  has_ct_scan: true,
  posterior_fracture_type: 'posterolateral',
}

/**
 * Danis-Weber classification result
 */
export const mockDanisWeber: DanisWeberClassification = {
  type: 'Weber B',
}

/**
 * Lauge-Hansen classification result
 */
export const mockLaugeHansen: LaugeHansenClassification = {
  type: 'SER II',
  ambiguous: false,
}

/**
 * AO/OTA classification result
 */
export const mockAOOTA: AOOTAClassification = {
  code: '44-B1.1',
}

/**
 * Bartonicek classification result
 */
export const mockBartonicek: BartonicekClassification = {
  type: 'Bartonicek 2',
}

/**
 * Complete classification result
 */
export const mockClassificationResult: ClassificationResult = {
  fracture_type: 'Lateral malleolus fracture',
  danis_weber: mockDanisWeber,
  lauge_hansen: mockLaugeHansen,
  ao_ota: mockAOOTA,
  notes: ['Isolated lateral malleolus fracture at syndesmosis level'],
}

/**
 * Complete classification result for trimalleolar fracture
 */
export const mockTrimalleolarResult: ClassificationResult = {
  fracture_type: 'Trimalleolar fracture',
  danis_weber: { type: 'Weber C' },
  lauge_hansen: { type: 'PER IV', ambiguous: false },
  ao_ota: { code: '44-C2.3' },
  bartonicek: mockBartonicek,
  notes: ['Complex trimalleolar fracture with posterior malleolus involvement'],
}

/**
 * Impossible classification result
 */
export const mockImpossibleResult: ClassificationResult = {
  fracture_type: 'Impossible combination',
  impossible: true,
  impossible_key: 'IMPOSSIBLE_INFRASINDESMAL_POSTERIOR',
  notes: ['Infrasindesmal fractures cannot involve the posterior malleolus'],
}

/**
 * Classification API request
 */
export const mockClassifyRequest: ClassifyFractureRequest = {
  ...mockFractureInput,
  language: 'en',
}

/**
 * Classification API response
 */
export const mockClassifyResponse: ClassifyFractureResponse = {
  classification: mockClassificationResult,
  confidence: 0.95,
  reasoning: 'Based on the provided characteristics, this is a Weber B fracture.',
  timestamp: '2024-01-15T10:30:00Z',
}

// ============================================================================
// Chat Mock Data
// ============================================================================

/**
 * Chat session response
 */
export const mockChatSession: ChatSessionResponse = {
  session_id: 'chat-session-123',
}

/**
 * Chat request
 */
export const mockChatRequest: ChatRequest = {
  message: 'I have a patient with a lateral malleolus fracture at the syndesmosis level',
  language: 'en',
  session_id: 'chat-session-123',
}

/**
 * Chat response - needs clarification
 */
export const mockChatResponseClarification: ChatResponse = {
  status: 'needs_clarification',
  confidence: 0.6,
  missing_fields: ['lateral_morphology'],
  clarifications: [
    {
      field: 'lateral_morphology',
      question: 'What is the morphology of the fracture line?',
      options: ['Transverse', 'Oblique', 'Spiral'],
    },
  ],
  message: 'I need more information about the fracture morphology.',
}

/**
 * Chat response - complete
 */
export const mockChatResponseComplete: ChatResponse = {
  status: 'complete',
  extracted_input: mockFractureInput,
  classification: mockClassificationResult,
  confidence: 0.95,
  message: 'Based on your description, here is the classification.',
}

// ============================================================================
// Case Management Mock Data
// ============================================================================

/**
 * Basic case
 */
export const mockCase: Case = {
  id: 'case-123',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-10T00:00:00Z',
  published_at: '2024-01-02T00:00:00Z',
  created_by: 'user-admin',
  title: 'Lateral Malleolus Fracture Case',
  description: 'A 45-year-old patient with ankle injury after fall',
  status: 'published',
  deadline: '2024-02-01T00:00:00Z',
  has_tac_images: true,
  response_count: 15,
  unique_users: 12,
  reference_classification: mockClassificationResult,
  reference_input: mockFractureInput,
  show_reference_after_submit: true,
  allow_multiple_responses: false,
  case_order: 1,
}

/**
 * Case image
 */
export const mockCaseImage: CaseImage = {
  id: 'image-1',
  case_id: 'case-123',
  category: 'xray',
  display_order: 1,
  filename: 'lateral_view.jpg',
  content_type: 'image/jpeg',
  size_bytes: 1024000,
}

/**
 * Case with images
 */
export const mockCaseWithImages: CaseWithImages = {
  ...mockCase,
  images: [
    mockCaseImage,
    {
      id: 'image-2',
      case_id: 'case-123',
      category: 'xray',
      display_order: 2,
      filename: 'ap_view.jpg',
      content_type: 'image/jpeg',
      size_bytes: 980000,
    },
    {
      id: 'image-3',
      case_id: 'case-123',
      category: 'tac',
      display_order: 3,
      filename: 'ct_axial.jpg',
      content_type: 'image/jpeg',
      size_bytes: 2048000,
    },
  ],
}

/**
 * User case item (list view)
 */
export const mockUserCaseItem: UserCaseItem = {
  id: 'case-123',
  title: 'Lateral Malleolus Fracture Case',
  description: 'A 45-year-old patient with ankle injury after fall',
  status: 'published',
  deadline: '2024-02-01T00:00:00Z',
  published_at: '2024-01-02T00:00:00Z',
  has_tac_images: true,
  response_count: 15,
  image_count: 3,
  has_responded: false,
  my_response_count: 0,
}

/**
 * User case detail
 */
export const mockUserCaseDetail: UserCaseDetail = {
  id: 'case-123',
  title: 'Lateral Malleolus Fracture Case',
  description: 'A 45-year-old patient with ankle injury after fall',
  status: 'published',
  deadline: '2024-02-01T00:00:00Z',
  published_at: '2024-01-02T00:00:00Z',
  has_tac_images: true,
  images: [
    { id: 'image-1', category: 'xray', display_order: 1, filename: 'lateral_view.jpg' },
    { id: 'image-2', category: 'xray', display_order: 2, filename: 'ap_view.jpg' },
    { id: 'image-3', category: 'tac', display_order: 3, filename: 'ct_axial.jpg' },
  ],
  has_responded: false,
  my_response_count: 0,
  allow_multiple_responses: false,
  is_expired: false,
}

/**
 * Case response
 */
export const mockCaseResponse: CaseResponse = {
  id: 'response-1',
  case_id: 'case-123',
  user_id: 'user-123',
  created_at: '2024-01-15T10:00:00Z',
  classification: mockClassificationResult,
  time_taken_ms: 45000,
}

// ============================================================================
// User Mock Data
// ============================================================================

/**
 * Regular user profile
 */
export const mockUser: UserProfile = {
  id: 'user-123',
  email: 'doctor@example.com',
  role: 'user',
  display_name: 'Dr. Smith',
  years_experience: 5,
  specialty: 'foot_ankle',
  training_level: 'attending',
  institution: 'City Hospital',
}

/**
 * Admin user profile
 */
export const mockAdminUser: UserProfile = {
  id: 'user-admin',
  email: 'admin@example.com',
  role: 'admin',
  display_name: 'Admin User',
  years_experience: 10,
  specialty: 'foot_ankle',
  training_level: 'attending',
}

// ============================================================================
// Analytics Mock Data
// ============================================================================

/**
 * Case analytics summary
 */
export const mockCaseAnalytics: CaseAnalyticsSummary = {
  case_id: 'case-123',
  title: 'Lateral Malleolus Fracture Case',
  status: 'published',
  response_count: 50,
  unique_respondents: 45,
  avg_time_taken_ms: 42000,
  danis_weber_distribution: {
    'Weber A': 5,
    'Weber B': 40,
    'Weber C': 5,
  },
  lauge_hansen_distribution: {
    'SA': 3,
    'SER': 38,
    'PER': 7,
    'PA': 2,
  },
  ao_ota_distribution: {
    '44-A1': 5,
    '44-B1': 25,
    '44-B2': 15,
    '44-C1': 5,
  },
  bartonicek_distribution: {},
}

/**
 * Reliability metrics
 */
export const mockReliabilityMetrics: ReliabilityMetrics = {
  case_id: 'case-123',
  total_responses: 50,
  unique_raters: 45,
  danis_weber_agreement: {
    system: 'Danis-Weber',
    percent_agreement: 0.85,
    cohens_kappa: 0.78,
    cohens_kappa_ci: { lower: 0.72, upper: 0.84, level: 0.95 },
    fleiss_kappa: 0.75,
    category_counts: { 'Weber A': 5, 'Weber B': 40, 'Weber C': 5 },
  },
  lauge_hansen_agreement: {
    system: 'Lauge-Hansen',
    percent_agreement: 0.72,
    cohens_kappa: 0.65,
    cohens_kappa_ci: { lower: 0.58, upper: 0.72, level: 0.95 },
    fleiss_kappa: 0.62,
    category_counts: { 'SA': 3, 'SER': 38, 'PER': 7, 'PA': 2 },
  },
  gold_standard_accuracy: {
    overall_accuracy: 0.82,
    danis_weber_accuracy: 0.88,
    lauge_hansen_accuracy: 0.76,
    ao_ota_accuracy: 0.72,
    total_comparisons: 50,
    correct_responses: 41,
    incorrect_responses: 9,
  },
}

// ============================================================================
// Form Options Mock Data (for testing form components)
// ============================================================================

export const mockFormOptions = {
  involvedMalleoli: [
    { value: 'posterior_only', label: 'Posterior only' },
    { value: 'medial_only', label: 'Medial only' },
    { value: 'lateral_only', label: 'Lateral only' },
    { value: 'medial_posterior', label: 'Medial and posterior' },
    { value: 'lateral_posterior', label: 'Lateral and posterior' },
    { value: 'lateral_medial', label: 'Lateral and medial' },
    { value: 'trimaleolar', label: 'Trimalleolar' },
  ],
  fibularLevels: [
    { value: 'infrasindesmal', label: 'Infrasindesmal' },
    { value: 'transindesmal', label: 'Transindesmal' },
    { value: 'suprasindesmal', label: 'Suprasindesmal' },
  ],
  lateralMorphology: [
    { value: 'transverse', label: 'Transverse' },
    { value: 'oblique', label: 'Oblique' },
    { value: 'spiral', label: 'Spiral' },
  ],
  medialMorphology: [
    { value: 'oblique', label: 'Oblique' },
    { value: 'transverse', label: 'Transverse' },
  ],
  posteriorFractureTypes: [
    { value: 'extraincisural', label: 'Extraincisural (Bartonicek 1)' },
    { value: 'posterolateral', label: 'Posterolateral (Bartonicek 2)' },
    { value: 'posteromedial_posterolateral', label: 'Posteromedial and posterolateral (Bartonicek 3)' },
    { value: 'large_posterolateral', label: 'Large posterolateral (Bartonicek 4)' },
  ],
  suprasindesmalTypes: [
    { value: 'simple_diaphyseal', label: 'Simple diaphyseal' },
    { value: 'multifragmentary', label: 'Multifragmentary' },
    { value: 'proximal', label: 'Proximal' },
  ],
}
