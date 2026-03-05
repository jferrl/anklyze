import type { FractureInput } from '../domain/fracture';

/**
 * Generic form option type
 * Used for select dropdowns, radio buttons, and other choice components
 */
export interface FormOption<T = string> {
  /** The value to be submitted */
  value: T;

  /** Display label for the option */
  label: string;

  /** Optional description or help text */
  description?: string;

  /** Whether this option is disabled */
  disabled?: boolean;
}

/**
 * Form question configuration
 * Defines a single question/field in the form with its options and dependencies
 */
export interface FormQuestion {
  /** Unique identifier for the question */
  id: string;

  /** Display label for the question */
  label: string;

  /** Optional description or help text */
  description?: string;

  /** Whether this question is required */
  required?: boolean;

  /** Available options for this question */
  options?: FormOption[];

  /** Field IDs this question depends on (for conditional rendering) */
  dependsOn?: string[];
}

/**
 * Form validation error
 */
export interface FormError {
  /** Field that has the error */
  field: string;

  /** Error message */
  message: string;

  /** Error code for i18n */
  code?: string;
}

/**
 * Form state for fracture classification
 * Tracks the current form data, step, validation state, and errors
 */
export interface FormState extends Partial<FractureInput> {
  /** Current step in the multi-step form */
  currentStep?: number;

  /** Whether the current form state is valid */
  isValid?: boolean;

  /** Validation errors for form fields */
  errors?: FormError[];

  /** Whether the form has been touched/modified */
  touched?: boolean;

  /** Whether the form is currently submitting */
  submitting?: boolean;
}

/**
 * All form options for the fracture classification form
 * Maps each form field to its available options
 */
export interface FormOptions {
  /** Questions configuration keyed by question ID */
  questions: Record<string, Question>;

  /** Options for involved malleoli selection */
  involved_malleoli: FormOption[];

  /** Options for posterior fracture types (Bartonicek classification) */
  posterior_fracture_types: FormOption[];

  /** Options for medial morphology */
  medial_morphology: FormOption[];

  /** Options for medial morphology in lateral+medial cases */
  medial_morphology_lm: FormOption[];

  /** Options for fibular fracture levels */
  fibular_levels: FormOption[];

  /** Options for lateral fracture morphology */
  lateral_morphology: FormOption[];

  /** Options for fibula morphology in lateral+medial transindesmal cases */
  fibula_morphology_lm: FormOption[];

  /** Options for fibula morphology in trimaleolar transindesmal cases */
  fibula_morphology_tri: FormOption[];

  /** Options for suprasyndesmotic fracture types */
  suprasindesmal_types: FormOption[];

  /** Options for fibular level High/Low (lateral+medial and trimaleolar per MMD) */
  fibular_level_high_low: FormOption[];

  /** Options for fibular level sub-question for transverse morphology (infra/trans only) */
  fibular_level_for_transverse: FormOption[];

  /** Options for fibula trace patterns */
  fibula_trace_patterns: FormOption[];

  /** Options for articular involvement (posterior-only, medial-only) */
  articular_involvement_options: FormOption[];

  /** Options for posterior fracture types in medial+posterior path (5 options) */
  posterior_fracture_types_medial_posterior: FormOption[];

  /** Options for infrasindesmal morphology (avulsion vs malleolus fracture) */
  infrasindesmal_morphology: FormOption[];

  /** Options for lateral subtype (transindesmal lateral-only) */
  lateral_subtype: FormOption[];

  /** Options for medial subtype (bimalleolar paths) */
  medial_subtype: FormOption[];

  /** Additional labels and translations */
  labels: Record<string, string>;
}

/**
 * Form field configuration
 * Defines how a form field should be rendered and validated
 */
export interface FormField {
  /** Field name (matches FractureInput key) */
  name: keyof FractureInput;

  /** Field type */
  type: 'select' | 'radio' | 'checkbox' | 'boolean';

  /** Display label */
  label: string;

  /** Optional description */
  description?: string;

  /** Whether field is required */
  required?: boolean;

  /** Available options (for select/radio) */
  options?: FormOption[];

  /** Validation rules */
  validation?: {
    required?: boolean;
    custom?: (value: unknown) => boolean | string;
  };

  /** Field dependencies (conditional rendering) */
  dependsOn?: {
    field: keyof FractureInput;
    value: unknown;
  }[];
}

/**
 * Legacy SelectOption type for backward compatibility
 * Use FormOption instead for new code
 * @deprecated Use FormOption instead
 */
export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Legacy Question type for backward compatibility
 * Use FormQuestion instead for new code
 * @deprecated Use FormQuestion instead
 */
export interface Question {
  id: string;
  title: string;
  description?: string;
}
