import { useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Sparkles, ArrowLeft, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button, FormSkeleton, Badge } from '@/components/ui';
import { ComparisonView } from '@/components/ComparisonView';
import { getLocalFormOptions } from '@/utils/formOptions';
import { useClassification } from '@/hooks/useClassification';
import type { FractureInput } from '@/types';

// Import feature components
import { QuestionStep } from './QuestionStep';
import { ResultsPanel } from './ResultsPanel';
import { FormProgress } from './FormProgress';

// Import feature hooks
import { useFormState } from '../hooks/useFormState';
import { useFormPersistence } from '@/hooks/useFormPersistence';
import { useUrlParams } from '../hooks/useUrlParams';
import { useAutoScroll } from '../hooks/useAutoScroll';

/**
 * Check if form is complete and ready for classification
 */
function isFormComplete(formData: Partial<FractureInput>): boolean {
  const { involved_malleoli } = formData;
  if (!involved_malleoli) return false;

  // Each path has different required fields
  switch (involved_malleoli) {
    case 'posterior_only':
      if (formData.has_ct_scan === undefined) return false;
      if (formData.has_ct_scan === true && !formData.posterior_fracture_type) return false;
      return true;

    case 'medial_only':
      return !!formData.medial_morphology;

    case 'lateral_only':
      if (!formData.fibular_level) return false;
      if (formData.fibular_level === 'suprasindesmal' && !formData.lateral_morphology) {
        return !!formData.suprasindesmal_type;
      }
      if (!formData.lateral_morphology) return false;
      if (formData.lateral_morphology === 'spiral' && formData.fibular_level === 'suprasindesmal') {
        return !!formData.fibula_trace_pattern;
      }
      return true;

    case 'medial_posterior':
      if (!formData.medial_morphology) return false;
      if (formData.has_ct_scan === undefined) return false;
      if (formData.has_ct_scan === true && !formData.posterior_fracture_type) return false;
      return true;

    case 'lateral_posterior':
      if (!formData.fibular_level || !formData.lateral_morphology) return false;
      if (formData.fibular_level === 'suprasindesmal' && !formData.lateral_morphology && !formData.suprasindesmal_type) return false;
      if (formData.has_ct_scan === undefined) return false;
      if (formData.has_ct_scan === true && !formData.posterior_fracture_type) return false;
      return true;

    case 'lateral_medial':
      if (!formData.medial_morphology) return false;
      if (formData.medial_morphology === 'transverse' && formData.fibula_infrasindesmal_transverse === undefined) return false;
      if (!formData.fibular_level || !formData.lateral_morphology) return false;
      if (formData.lateral_morphology === 'spiral' && formData.fibular_level === 'suprasindesmal' && !formData.fibula_trace_pattern) return false;
      return true;

    case 'trimaleolar':
      if (!formData.fibular_level) return false;
      if (formData.fibular_level === 'suprasindesmal' && !formData.lateral_morphology && !formData.suprasindesmal_type) return false;
      if (!formData.lateral_morphology) return false;
      if (formData.lateral_morphology === 'spiral' && formData.fibular_level === 'suprasindesmal' && !formData.fibula_trace_pattern) return false;
      if (formData.lateral_morphology === 'transverse' && !formData.fibular_level_for_transverse) return false;
      if (formData.has_ct_scan === undefined) return false;
      if (formData.has_ct_scan === true && !formData.posterior_fracture_type) return false;
      return true;

    default:
      return false;
  }
}

/**
 * Calculate form progress based on filled fields
 */
function calculateProgress(formData: Partial<FractureInput>): { currentStep: number; totalSteps: number } {
  const filled = Object.keys(formData).filter(key =>
    formData[key as keyof FractureInput] !== undefined &&
    formData[key as keyof FractureInput] !== null
  ).length;

  // Estimate total steps based on involved_malleoli
  let estimatedTotal = 1; // Start with involved_malleoli question

  if (formData.involved_malleoli) {
    const type = formData.involved_malleoli;

    // Add estimated questions based on fracture type
    if (['lateral_only', 'lateral_posterior', 'lateral_medial', 'trimaleolar'].includes(type)) {
      estimatedTotal += 2; // fibular_level + lateral_morphology
    }
    if (['medial_only', 'medial_posterior', 'lateral_medial'].includes(type)) {
      estimatedTotal += 1; // medial_morphology
    }
    if (['posterior_only', 'medial_posterior', 'lateral_posterior', 'trimaleolar'].includes(type)) {
      estimatedTotal += 2; // has_ct_scan + optional posterior_type
    }
    if (formData.fibular_level === 'suprasindesmal') {
      estimatedTotal += 1; // suprasindesmal_type or trace pattern
    }
    if (type === 'lateral_medial' && formData.medial_morphology === 'transverse') {
      estimatedTotal += 1; // bimaleolar infra question
    }
  }

  return {
    currentStep: Math.min(filled, estimatedTotal),
    totalSteps: estimatedTotal,
  };
}

/**
 * Main FractureForm component
 *
 * Orchestrates the fracture classification form using extracted hooks and components.
 * Handles loading states, form rendering, and result display.
 */
export function FractureForm() {
  const { t, i18n } = useTranslation();

  // State management hooks
  const { formData, formHistory, updateFormData, clearFormData, goBack, canGoBack } = useFormState();
  const { restore, clear: clearPersistence } = useFormPersistence('fracture', formData, formHistory);

  // Track last successful classification
  const lastInputRef = useRef<FractureInput | null>(null);

  // Track if we've already restored from storage (prevent duplicate toasts in StrictMode)
  const hasRestoredRef = useRef(false);

  // Load form options
  const options = useMemo(() => getLocalFormOptions(), [i18n.language]);

  // Classification hook
  const {
    result,
    loading,
    error,
    scenarios,
    classify,
    addScenario,
    clearScenarios,
    reset,
    resetAll,
  } = useClassification();

  // URL params loading (with auto-classification)
  const { isLoading: loadingFromUrl } = useUrlParams(async (input) => {
    lastInputRef.current = input as FractureInput;
    await classify(input as FractureInput);
  });

  // Auto-scroll when form data changes
  const formEndRef = useAutoScroll(formData);

  /**
   * Restore form from IndexedDB on mount (if not loading from URL)
   */
  useEffect(() => {
    if (loadingFromUrl || hasRestoredRef.current) return;

    // Set ref immediately to prevent duplicate calls in StrictMode
    hasRestoredRef.current = true;

    const restoreFormData = async () => {
      const restored = await restore();
      if (restored) {
        updateFormData(restored.data);
        toast.info(t('form.draftRestored'), { duration: 3000 });
      }
    };

    restoreFormData();
  }, [loadingFromUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormComplete(formData) || loading) return;

    try {
      lastInputRef.current = formData as FractureInput;
      await classify(formData as FractureInput);
      clearPersistence();
    } catch {
      // Error already handled by useClassification
    }
  };

  /**
   * Reset form to start over
   */
  const handleReset = () => {
    clearFormData();
    reset();
    clearPersistence();
  };

  /**
   * Reset everything including scenarios
   */
  const handleStartOver = () => {
    clearFormData();
    resetAll();
    clearPersistence();
  };

  /**
   * Start comparison mode
   */
  const handleStartComparison = () => {
    if (!lastInputRef.current || !result) return;
    addScenario(lastInputRef.current, result);
    reset();
    clearFormData();
  };

  /**
   * Clear comparison scenarios
   */
  const handleClearComparison = () => {
    clearScenarios();
  };

  // Show loading skeleton while loading from URL
  if (loadingFromUrl) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <FormSkeleton />
      </div>
    );
  }

  // Show comparison view when we have 2+ scenarios
  if (scenarios.length >= 2) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <ComparisonView scenarios={scenarios} />
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          {scenarios.length < 3 && (
            <Button onClick={handleStartComparison} variant="outline" className="flex-1">
              {t('comparison.addAnother')}
            </Button>
          )}
          <Button onClick={handleClearComparison} variant="outline" className="flex-1">
            {t('comparison.clear')}
          </Button>
          <Button onClick={handleStartOver} className="flex-1">
            {t('comparison.startOver')}
          </Button>
        </div>
      </div>
    );
  }

  // Show result with actions
  if (result && lastInputRef.current) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <ResultsPanel
          result={result}
          input={lastInputRef.current}
          onReset={handleReset}
          onCompare={handleStartComparison}
        />
      </div>
    );
  }

  // Determine which questions to show based on form data
  const showFibularLevel = formData.involved_malleoli &&
    ['lateral_only', 'lateral_posterior', 'lateral_medial', 'trimaleolar'].includes(formData.involved_malleoli);

  const showLateralMorphology = showFibularLevel && formData.fibular_level;

  const showSuprasindesmalType = formData.fibular_level === 'suprasindesmal';

  const showFibulaTracePattern = formData.lateral_morphology === 'spiral' &&
    formData.fibular_level === 'suprasindesmal';

  const showMedialMorphology = formData.involved_malleoli &&
    ['medial_only', 'medial_posterior', 'lateral_medial'].includes(formData.involved_malleoli);

  const showBimaleolarInfraQuestion = formData.involved_malleoli === 'lateral_medial' &&
    formData.medial_morphology === 'transverse';

  const showCTScan = formData.involved_malleoli &&
    ['posterior_only', 'medial_posterior', 'lateral_posterior', 'trimaleolar'].includes(formData.involved_malleoli);

  const showPosteriorType = formData.has_ct_scan === true;

  const showTrimaleolarTransverseLevel = formData.involved_malleoli === 'trimaleolar' &&
    formData.lateral_morphology === 'transverse';

  // Create yes/no options for boolean questions
  const yesNoOptions = [
    { value: 'true', label: options.labels.yes },
    { value: 'false', label: options.labels.no },
  ];

  // Calculate progress
  const { currentStep, totalSteps } = calculateProgress(formData);

  // Build breadcrumb trail of answered questions
  const getBreadcrumbTrail = () => {
    const trail: { label: string; key: string }[] = [];

    // Involved malleoli (always first)
    if (formData.involved_malleoli) {
      const option = options.involved_malleoli?.find(
        opt => opt.value === formData.involved_malleoli
      );
      if (option) trail.push({ label: option.label, key: 'involved_malleoli' });
    }

    // Fibular level
    if (formData.fibular_level) {
      const option = options.fibular_levels?.find(
        opt => opt.value === formData.fibular_level
      );
      if (option) trail.push({ label: option.label, key: 'fibular_level' });
    }

    // Lateral morphology
    if (formData.lateral_morphology) {
      const option = options.lateral_morphology?.find(
        opt => opt.value === formData.lateral_morphology
      );
      if (option) trail.push({ label: option.label, key: 'lateral_morphology' });
    }

    // Suprasindesmal type
    if (formData.suprasindesmal_type) {
      const option = options.suprasindesmal_types?.find(
        opt => opt.value === formData.suprasindesmal_type
      );
      if (option) trail.push({ label: option.label, key: 'suprasindesmal_type' });
    }

    // Medial morphology
    if (formData.medial_morphology) {
      const option = options.medial_morphology?.find(
        opt => opt.value === formData.medial_morphology
      );
      if (option) trail.push({ label: option.label, key: 'medial_morphology' });
    }

    // CT scan
    if (formData.has_ct_scan !== undefined) {
      const label = formData.has_ct_scan ? options.labels.yes : options.labels.no;
      trail.push({ label: `CT: ${label}`, key: 'has_ct_scan' });
    }

    // Posterior fracture type
    if (formData.posterior_fracture_type) {
      const option = options.posterior_types?.find(
        opt => opt.value === formData.posterior_fracture_type
      );
      if (option) trail.push({ label: option.label, key: 'posterior_fracture_type' });
    }

    // Fibula infrasindesmal transverse
    if (formData.fibula_infrasindesmal_transverse !== undefined) {
      const label = formData.fibula_infrasindesmal_transverse ? options.labels.yes : options.labels.no;
      trail.push({ label: label, key: 'fibula_infrasindesmal_transverse' });
    }

    // Fibula trace pattern
    if (formData.fibula_trace_pattern) {
      const option = options.fibula_trace_patterns?.find(
        opt => opt.value === formData.fibula_trace_pattern
      );
      if (option) trail.push({ label: option.label, key: 'fibula_trace_pattern' });
    }

    // Fibular level for transverse
    if (formData.fibular_level_for_transverse) {
      const option = options.fibular_levels?.find(
        opt => opt.value === formData.fibular_level_for_transverse
      );
      if (option) trail.push({ label: option.label, key: 'fibular_level_for_transverse' });
    }

    return trail;
  };

  const breadcrumbTrail = getBreadcrumbTrail();

  // Render the form
  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold mb-2">{t('app.title')}</h1>
        <p className="text-muted-foreground">{t('app.description')}</p>
      </div>

      {/* Progress indicator with breadcrumb trail and progress bar */}
      {breadcrumbTrail.length > 0 && (
        <div className="space-y-4 mb-6">
          {/* Breadcrumb trail showing answered questions */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {breadcrumbTrail.map((item, index) => (
              <div key={item.key} className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  {item.label}
                </Badge>
                {index < breadcrumbTrail.length - 1 && (
                  <span className="text-muted-foreground text-sm">›</span>
                )}
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <FormProgress
            currentStep={currentStep}
            totalSteps={totalSteps}
            showStepCounter={false}
          />
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between items-center mb-6">
        {canGoBack && formData.involved_malleoli ? (
          <Button
            type="button"
            variant="ghost"
            onClick={goBack}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('form.back')}
          </Button>
        ) : (
          <div />
        )}

        <Button
          type="button"
          variant="ghost"
          onClick={handleReset}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          {t('form.reset')}
        </Button>
      </div>

      {/* Questions */}
      <QuestionStep
        question={{
          id: 'involved_malleoli',
          title: options.questions.involved_malleoli?.title || 'Which malleoli are fractured?',
        }}
        value={formData.involved_malleoli}
        options={options.involved_malleoli || []}
        onChange={(value) => updateFormData({ ...formData, involved_malleoli: value as any })}
      />

      {showFibularLevel && (
        <QuestionStep
          question={{
            id: 'fibular_level',
            title: options.questions.fibular_level?.title || 'Fibular fracture level?',
          }}
          value={formData.fibular_level}
          options={options.fibular_levels || []}
          onChange={(value) => updateFormData({ ...formData, fibular_level: value as any })}
        />
      )}

      {showLateralMorphology && !showSuprasindesmalType && (
        <QuestionStep
          question={{
            id: 'lateral_morphology',
            title: options.questions.lateral_morphology?.title || 'Lateral fracture morphology?',
          }}
          value={formData.lateral_morphology}
          options={options.lateral_morphology || []}
          onChange={(value) => updateFormData({ ...formData, lateral_morphology: value as any })}
        />
      )}

      {showSuprasindesmalType && (
        <QuestionStep
          question={{
            id: 'suprasindesmal_type',
            title: options.questions.suprasindesmal_type?.title || 'Suprasindesmotic fracture type?',
          }}
          value={formData.suprasindesmal_type}
          options={options.suprasindesmal_types || []}
          onChange={(value) => updateFormData({ ...formData, suprasindesmal_type: value as any })}
        />
      )}

      {showFibulaTracePattern && (
        <QuestionStep
          question={{
            id: 'fibula_trace_pattern',
            title: options.questions.fibula_trace_pattern?.title || 'Fibula trace pattern?',
          }}
          value={formData.fibula_trace_pattern}
          options={options.fibula_trace_patterns || []}
          onChange={(value) => updateFormData({ ...formData, fibula_trace_pattern: value as any })}
        />
      )}

      {showMedialMorphology && (
        <QuestionStep
          question={{
            id: 'medial_morphology',
            title: options.questions.medial_morphology?.title || 'Medial fracture morphology?',
          }}
          value={formData.medial_morphology}
          options={options.medial_morphology || []}
          onChange={(value) => updateFormData({ ...formData, medial_morphology: value as any })}
        />
      )}

      {showBimaleolarInfraQuestion && (
        <QuestionStep
          question={{
            id: 'fibula_infrasindesmal_transverse',
            title: options.questions.fibula_infrasindesmal_transverse?.title || 'Is fibula fracture infrasindesmal AND transverse?',
          }}
          value={formData.fibula_infrasindesmal_transverse?.toString()}
          options={yesNoOptions}
          onChange={(value) => updateFormData({ ...formData, fibula_infrasindesmal_transverse: value === 'true' })}
        />
      )}

      {showTrimaleolarTransverseLevel && (
        <QuestionStep
          question={{
            id: 'fibular_level_for_transverse',
            title: options.questions.fibular_level_for_transverse?.title || 'Fibular level for transverse fracture?',
          }}
          value={formData.fibular_level_for_transverse}
          options={options.fibular_levels || []}
          onChange={(value) => updateFormData({ ...formData, fibular_level_for_transverse: value as any })}
        />
      )}

      {showCTScan && (
        <QuestionStep
          question={{
            id: 'has_ct_scan',
            title: options.questions.has_ct_scan?.title || 'Do you have a CT scan?',
          }}
          value={formData.has_ct_scan?.toString()}
          options={yesNoOptions}
          onChange={(value) => updateFormData({ ...formData, has_ct_scan: value === 'true', posterior_fracture_type: undefined })}
        />
      )}

      {showPosteriorType && (
        <QuestionStep
          question={{
            id: 'posterior_fracture_type',
            title: options.questions.posterior_fracture_type?.title || 'Posterior fracture type (Bartoníček)?',
          }}
          value={formData.posterior_fracture_type}
          options={options.posterior_fracture_types || []}
          onChange={(value) => updateFormData({ ...formData, posterior_fracture_type: value as any })}
        />
      )}

      {/* Error display */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={formEndRef} />

      {/* Submit button */}
      <Button
        type="submit"
        disabled={!isFormComplete(formData) || loading}
        className="w-full"
        size="lg"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('form.classifying')}
          </span>
        ) : isFormComplete(formData) ? (
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            {t('form.classify')}
          </span>
        ) : (
          t('form.classify')
        )}
      </Button>

      {/* Keyboard hint */}
      <p className="text-xs text-muted-foreground text-center">
        {t('form.keyboardHint')}
      </p>
    </form>
  );
}
