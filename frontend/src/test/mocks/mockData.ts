import type {
  FractureInput,
  ClassificationResult,
  DanisWeberClassification,
  LaugeHansenClassification,
  AOOTAClassification,
} from '@/types/domain/fracture'
import type {
  ChatResponse,
  ChatSessionResponse,
} from '@/types/api/chat'
import type {
  Case,
  CaseImage,
  CaseWithImages,
  UserCaseItem,
  UserCaseDetail,
  UserProfile,
  CaseAnalyticsSummary,
  ReliabilityMetrics,
} from '@/types/domain/case'

// ============================================================================
// Fracture Classification Mock Data
// ============================================================================

export const mockFractureInput: FractureInput = {
  involved_malleoli: 'lateral_only',
  fibular_level: 'transindesmal',
  lateral_morphology: 'oblique',
}

const mockDanisWeber: DanisWeberClassification = {
  type: 'Weber B',
}

const mockLaugeHansen: LaugeHansenClassification = {
  type: 'SER II',
  ambiguous: false,
}

const mockAOOTA: AOOTAClassification = {
  code: '44-B1.1',
}

export const mockClassificationResult: ClassificationResult = {
  fracture_type: 'Lateral malleolus fracture',
  danis_weber: mockDanisWeber,
  lauge_hansen: mockLaugeHansen,
  ao_ota: mockAOOTA,
  notes: ['Isolated lateral malleolus fracture at syndesmosis level'],
}

// ============================================================================
// Chat Mock Data
// ============================================================================

export const mockChatSession: ChatSessionResponse = {
  session_id: 'chat-session-123',
}

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

const mockCaseImage: CaseImage = {
  id: 'image-1',
  case_id: 'case-123',
  category: 'xray',
  display_order: 1,
  filename: 'lateral_view.jpg',
  content_type: 'image/jpeg',
  size_bytes: 1024000,
}

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

// ============================================================================
// User Mock Data
// ============================================================================

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

// ============================================================================
// Analytics Mock Data
// ============================================================================

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
