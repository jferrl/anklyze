import { useEffect, useRef, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Sparkles, ArrowLeft, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button, FormSkeleton } from '@/components/ui';
import { ComparisonView } from '@/components/ComparisonView';
import { getLocalFormOptions } from '@/utils/formOptions';
import { useClassification } from '@/hooks/useClassification';
import type {
  FractureInput,
  InvolvedMalleoli,
  FibularLevel,
  LateralMorphology,
  SuprasindesmalType,
  FibulaTracePattern,
  MedialMorphology,
  PosteriorFractureType,
  ArticularInvolvement,
  LateralSubtype,
  MedialSubtype,
} from '@/types';

// Import feature components
import { QuestionStep } from './QuestionStep';
import { ResultsPanel } from './ResultsPanel';
import { FormProgress } from './FormProgress';
import { BreadcrumbTrail } from './BreadcrumbTrail';

// Import feature utilities
import { isFormComplete, calculateProgress } from '../utils/formValidation';

// Import feature hooks
import { useFormState } from '../hooks/useFormState';
import { useFormPersistence } from '@/hooks/useFormPersistence';
import { useUrlParams } from '../hooks/useUrlParams';
import { useAutoScroll } from '../hooks/useAutoScroll';

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

  // Track last successful classification input (state for render access)
  const [lastInput, setLastInput] = useState<FractureInput | null>(null);

  // Track if we've already restored from storage (prevent duplicate toasts in StrictMode)
  const hasRestoredRef = useRef(false);

  // Load form options (re-compute when language changes)
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setLastInput(input as FractureInput);
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
      setLastInput(formData as FractureInput);
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
    if (!lastInput || !result) return;
    addScenario(lastInput, result);
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
  if (result && lastInput) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <ResultsPanel
          result={result}
          input={lastInput}
          onReset={handleReset}
          onCompare={handleStartComparison}
        />
      </div>
    );
  }

  // Determine which questions to show based on form data (matching MMD decision tree)

  // Articular involvement: posterior_only uses 2-option select, medial_only uses Yes/No per reference MMD
  const showArticularInvolvementSelect = formData.involved_malleoli === 'posterior_only';
  const showArticularInvolvementYesNo = formData.involved_malleoli === 'medial_only';

  // Articular depression: when articular_involvement = large_with_extension (either path)
  const showArticularDepression = (showArticularInvolvementSelect || showArticularInvolvementYesNo) &&
    formData.articular_involvement === 'large_with_extension';

  // Medial morphology: for medial_only (only after small_without_extension) and lateral_medial
  const showMedialMorphology = formData.involved_malleoli &&
    (
      formData.involved_malleoli === 'lateral_medial' ||
      (formData.involved_malleoli === 'medial_only' &&
        formData.articular_involvement === 'small_without_extension')
    );

  const showBimaleolarInfraQuestion = formData.involved_malleoli === 'lateral_medial' &&
    formData.medial_morphology === 'vertical';

  const lateralMedialReadyForFibularLevel = formData.involved_malleoli === 'lateral_medial' && (
    formData.medial_morphology === 'transverse_oblique' ||
    (formData.medial_morphology === 'vertical' && formData.fibula_infrasindesmal_transverse === false)
  );

  const showFibularLevel = formData.involved_malleoli &&
    (
      ['lateral_only', 'lateral_posterior', 'trimaleolar'].includes(formData.involved_malleoli) ||
      lateralMedialReadyForFibularLevel
    );

  // Skip morphology for lateral-only infrasyndesmotic and lateral+posterior infrasyndesmotic
  const skipLateralOnlyInfra = formData.involved_malleoli === 'lateral_only' &&
    formData.fibular_level === 'infrasindesmal';
  const skipLateralPosteriorInfra = formData.involved_malleoli === 'lateral_posterior' &&
    formData.fibular_level === 'infrasindesmal';

  const showLateralMorphology = showFibularLevel && formData.fibular_level &&
    !skipLateralOnlyInfra && !skipLateralPosteriorInfra;

  // Infrasindesmal morphology subtype: lateral_only + infrasindesmal, or trimaleolar + transverse + infrasindesmal,
  // or lateral_medial + transverse + infrasindesmal
  const showInfrasindesmalMorphology =
    (formData.involved_malleoli === 'lateral_only' && formData.fibular_level === 'infrasindesmal') ||
    (formData.involved_malleoli === 'trimaleolar' && formData.lateral_morphology === 'transverse' &&
      formData.fibular_level_for_transverse === 'infrasindesmal') ||
    (formData.involved_malleoli === 'lateral_medial' && formData.lateral_morphology === 'transverse' &&
      formData.fibular_level_for_transverse === 'infrasindesmal');

  // Lateral subtype: lateral_only + transindesmal + morphology selected
  const showLateralSubtype = formData.involved_malleoli === 'lateral_only' &&
    formData.fibular_level === 'transindesmal' && !!formData.lateral_morphology;

  // Medial subtype: lateral_medial or trimaleolar transindesmal paths
  const showMedialSubtype = (
    // lateral_medial paths
    formData.involved_malleoli === 'lateral_medial' && (
      // Low path with non-conminuta morphology
      (formData.fibular_level === 'transindesmal' && !!formData.lateral_morphology &&
        formData.lateral_morphology !== 'conminuta') ||
      // Suprasindesmal path (for C1/C2 subtypes)
      (formData.fibular_level === 'suprasindesmal' && !!formData.suprasindesmal_type &&
        formData.suprasindesmal_type !== 'proximal')
    )
  ) || (
    // trimaleolar transindesmal paths (oblique, spiral, or transverse+transindesmal)
    formData.involved_malleoli === 'trimaleolar' &&
    formData.fibular_level === 'transindesmal' &&
    !!formData.lateral_morphology &&
    formData.lateral_morphology !== 'conminuta' && (
      formData.lateral_morphology !== 'transverse' ||
      formData.fibular_level_for_transverse === 'transindesmal'
    )
  );

  // Fibula head shortening: lateral_medial + suprasindesmal + proximal
  const showFibulaHeadShortening = formData.involved_malleoli === 'lateral_medial' &&
    formData.fibular_level === 'suprasindesmal' &&
    formData.suprasindesmal_type === 'proximal';

  const showSuprasindesmalType = formData.fibular_level === 'suprasindesmal';

  const showFibulaTracePattern = formData.fibular_level === 'suprasindesmal' &&
    formData.suprasindesmal_type !== undefined &&
    formData.suprasindesmal_type !== 'proximal';

  // No longer skip CT for trimaleolar transverse infrasindesmal - it needs CT + Bartonicek
  const skipTrimaleolarTransverseInfra = false;

  const showCTScan = formData.involved_malleoli && (
    // posterior_only: only after articular involvement resolved to small_without_extension
    (formData.involved_malleoli === 'posterior_only' &&
      formData.articular_involvement === 'small_without_extension') ||
    // medial_posterior: always
    formData.involved_malleoli === 'medial_posterior' ||
    // lateral_posterior: all levels including infrasindesmal
    (formData.involved_malleoli === 'lateral_posterior' && !!formData.fibular_level) ||
    // trimaleolar: not transverse infrasindesmal
    (formData.involved_malleoli === 'trimaleolar' && !skipTrimaleolarTransverseInfra)
  );

  // Posterior posteromedial: lateral_posterior + infrasindesmal + CT=true
  const showPosteriorPosteromedial = formData.involved_malleoli === 'lateral_posterior' &&
    formData.fibular_level === 'infrasindesmal' &&
    formData.has_ct_scan === true;

  // Posterior type: after CT=true, but for lateral_posterior infra, only after posteromedial=false
  const showPosteriorType = showCTScan && formData.has_ct_scan === true && (
    !(formData.involved_malleoli === 'lateral_posterior' &&
      formData.fibular_level === 'infrasindesmal') ||
    formData.is_posterior_posteromedial === false
  );

  const showTrimaleolarTransverseLevel = formData.involved_malleoli === 'trimaleolar' &&
    formData.lateral_morphology === 'transverse';

  const showLateralMedialTransverseLevel = formData.involved_malleoli === 'lateral_medial' &&
    formData.lateral_morphology === 'transverse';

  // Create yes/no options for boolean questions
  const yesNoOptions = [
    { value: 'true', label: options.labels.yes },
    { value: 'false', label: options.labels.no },
  ];

  // Calculate progress
  const { currentStep, totalSteps } = calculateProgress(formData);

  // Render the form
  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold mb-2">{t('app.title')}</h1>
        <p className="text-muted-foreground">{t('app.description')}</p>
      </div>

      {/* Progress indicator with breadcrumb trail and progress bar */}
      {formData.involved_malleoli && (
        <div className="space-y-4 mb-6">
          {/* Breadcrumb trail showing answered questions */}
          <BreadcrumbTrail formData={formData} options={options} />

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
        onChange={(value) => updateFormData({ ...formData, involved_malleoli: value as InvolvedMalleoli })}
      />

      {showArticularInvolvementSelect && (
        <QuestionStep
          question={{
            id: 'articular_involvement',
            title: options.questions.articular_involvement?.title || 'Articular surface involvement?',
          }}
          value={formData.articular_involvement}
          options={options.articular_involvement_options || []}
          onChange={(value) => updateFormData({ ...formData, articular_involvement: value as ArticularInvolvement })}
        />
      )}

      {showArticularInvolvementYesNo && (
        <QuestionStep
          question={{
            id: 'articular_involvement',
            title: options.questions.articular_involvement_medial?.title || 'Is there significant articular involvement with metaphyseal extension?',
          }}
          value={formData.articular_involvement === 'large_with_extension' ? 'true' : formData.articular_involvement === 'small_without_extension' ? 'false' : undefined}
          options={yesNoOptions}
          onChange={(value) => updateFormData({ ...formData, articular_involvement: (value === 'true' ? 'large_with_extension' : 'small_without_extension') as ArticularInvolvement })}
        />
      )}

      {showArticularDepression && (
        <QuestionStep
          question={{
            id: 'has_articular_depression',
            title: options.questions.has_articular_depression?.title || 'Is articular depression present?',
          }}
          value={formData.has_articular_depression?.toString()}
          options={yesNoOptions}
          onChange={(value) => updateFormData({ ...formData, has_articular_depression: value === 'true' })}
        />
      )}

      {showMedialMorphology && (
        <QuestionStep
          question={{
            id: 'medial_morphology',
            title: (formData.involved_malleoli === 'lateral_medial'
              ? options.questions.medial_morphology_lm?.title
              : options.questions.medial_morphology?.title) || 'Medial fracture morphology?',
          }}
          value={formData.medial_morphology}
          options={
            formData.involved_malleoli === 'lateral_medial'
              ? (options.medial_morphology_lm || [])
              : (options.medial_morphology || [])
          }
          onChange={(value) => updateFormData({ ...formData, medial_morphology: value as MedialMorphology })}
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

      {showFibularLevel && (
        <QuestionStep
          question={{
            id: 'fibular_level',
            title: (
              formData.involved_malleoli === 'lateral_medial'
                ? options.questions.fibular_level_lm?.title
                : formData.involved_malleoli === 'trimaleolar'
                  ? options.questions.fibular_level_tri?.title
                  : options.questions.fibular_level?.title
            ) || 'Fibular fracture level?',
          }}
          value={formData.fibular_level}
          options={
            ['lateral_medial', 'trimaleolar'].includes(formData.involved_malleoli || '')
              ? (options.fibular_level_high_low || [])
              : (options.fibular_levels || [])
          }
          onChange={(value) => updateFormData({ ...formData, fibular_level: value as FibularLevel })}
        />
      )}

      {showLateralMorphology && !showSuprasindesmalType && (
        <QuestionStep
          question={{
            id: 'lateral_morphology',
            title: options.questions.lateral_morphology?.title || 'Lateral fracture morphology?',
          }}
          value={formData.lateral_morphology}
          options={
            ['lateral_medial', 'trimaleolar'].includes(formData.involved_malleoli || '')
              ? (options.fibula_morphology_lm_tri || [])
              : (options.lateral_morphology || [])
          }
          onChange={(value) => updateFormData({ ...formData, lateral_morphology: value as LateralMorphology })}
        />
      )}

      {showInfrasindesmalMorphology && (
        <QuestionStep
          question={{
            id: 'infrasindesmal_morphology',
            title: options.questions.infrasindesmal_morphology?.title || 'Infrasyndesmal fracture morphology?',
          }}
          value={formData.infrasindesmal_morphology}
          options={options.infrasindesmal_morphology || []}
          onChange={(value) => updateFormData({ ...formData, infrasindesmal_morphology: value as LateralSubtype })}
        />
      )}

      {showLateralSubtype && (
        <QuestionStep
          question={{
            id: 'lateral_subtype',
            title: options.questions.lateral_subtype?.title || 'Lateral fracture subtype?',
          }}
          value={formData.lateral_subtype}
          options={options.lateral_subtype || []}
          onChange={(value) => updateFormData({ ...formData, lateral_subtype: value as LateralSubtype })}
        />
      )}

      {showMedialSubtype && (
        <QuestionStep
          question={{
            id: 'medial_subtype',
            title: options.questions.medial_subtype?.title || 'Medial involvement subtype?',
          }}
          value={formData.medial_subtype}
          options={options.medial_subtype || []}
          onChange={(value) => updateFormData({ ...formData, medial_subtype: value as MedialSubtype })}
        />
      )}

      {showFibulaHeadShortening && (
        <QuestionStep
          question={{
            id: 'has_fibula_head_shortening',
            title: options.questions.has_fibula_head_shortening?.title || 'Is there fibula head shortening?',
          }}
          value={formData.has_fibula_head_shortening?.toString()}
          options={yesNoOptions}
          onChange={(value) => updateFormData({ ...formData, has_fibula_head_shortening: value === 'true' })}
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
          onChange={(value) => updateFormData({ ...formData, suprasindesmal_type: value as SuprasindesmalType })}
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
          onChange={(value) => updateFormData({ ...formData, fibula_trace_pattern: value as FibulaTracePattern })}
        />
      )}

      {showTrimaleolarTransverseLevel && (
        <QuestionStep
          question={{
            id: 'fibular_level_for_transverse',
            title: options.questions.fibular_level_for_transverse?.title || 'Fibular level for transverse fracture?',
          }}
          value={formData.fibular_level_for_transverse}
          options={options.fibular_level_for_transverse || []}
          onChange={(value) => updateFormData({ ...formData, fibular_level_for_transverse: value as FibularLevel })}
        />
      )}

      {showLateralMedialTransverseLevel && (
        <QuestionStep
          question={{
            id: 'fibular_level_for_transverse',
            title: options.questions.fibular_level_for_transverse?.title || 'Fibular level for transverse fracture?',
          }}
          value={formData.fibular_level_for_transverse}
          options={options.fibular_level_for_transverse || []}
          onChange={(value) => updateFormData({ ...formData, fibular_level_for_transverse: value as FibularLevel })}
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
          onChange={(value) => updateFormData({ ...formData, has_ct_scan: value === 'true', posterior_fracture_type: undefined, is_posterior_posteromedial: undefined })}
        />
      )}

      {showPosteriorPosteromedial && (
        <QuestionStep
          question={{
            id: 'is_posterior_posteromedial',
            title: options.questions.is_posterior_posteromedial?.title || 'Is the posterior fragment posteromedial?',
          }}
          value={formData.is_posterior_posteromedial?.toString()}
          options={yesNoOptions}
          onChange={(value) => updateFormData({ ...formData, is_posterior_posteromedial: value === 'true' })}
        />
      )}

      {showPosteriorType && (
        <QuestionStep
          question={{
            id: 'posterior_fracture_type',
            title: options.questions.posterior_fracture_type?.title || 'Posterior fracture type (Bartoníček)?',
          }}
          value={formData.posterior_fracture_type}
          options={
            formData.involved_malleoli === 'medial_posterior'
              ? (options.posterior_fracture_types_medial_posterior || [])
              : (options.posterior_fracture_types || [])
          }
          onChange={(value) => updateFormData({ ...formData, posterior_fracture_type: value as PosteriorFractureType })}
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
