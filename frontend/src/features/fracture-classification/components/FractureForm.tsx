import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Sparkles, ArrowLeft, RotateCcw } from 'lucide-react';
import { Button, FormSkeleton } from '@/components/ui';
import { ComparisonView } from '@/components/ComparisonView';
import { getLocalFormOptions } from '@/utils/formOptions';
import { useClassification } from '@/hooks/useClassification';
import type { FractureInput } from '@/types';

import { ClassificationFormQuestions } from './ClassificationFormQuestions';
import { ResultsPanel } from './ResultsPanel';
import { FormProgress } from './FormProgress';
import { BreadcrumbTrail } from './BreadcrumbTrail';

import { isFormComplete, calculateProgress } from '../utils/formValidation';

import { useFormState } from '../hooks/useFormState';
import { useUrlParams } from '../hooks/useUrlParams';

/**
 * Main FractureForm component for the /classify page.
 *
 * Orchestrates the classification form with URL params, comparison mode,
 * and result display. The actual form questions are rendered by
 * ClassificationFormQuestions (the single source of truth).
 */
export function FractureForm() {
  const { t, i18n } = useTranslation();

  const { formData, updateFormData, clearFormData, goBack, canGoBack } = useFormState();
  const [lastInput, setLastInput] = useState<FractureInput | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const options = useMemo(() => getLocalFormOptions(), [i18n.language]);

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

  const { isLoading: loadingFromUrl } = useUrlParams(async (input) => {
    setLastInput(input as FractureInput);
    await classify(input as FractureInput);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormComplete(formData) || loading) return;

    try {
      setLastInput(formData as FractureInput);
      await classify(formData as FractureInput);
    } catch {
      // Error already handled by useClassification
    }
  };

  const handleReset = () => {
    clearFormData();
    reset();
  };

  const handleStartOver = () => {
    clearFormData();
    resetAll();
  };

  const handleStartComparison = () => {
    if (!lastInput || !result) return;
    addScenario(lastInput, result);
    reset();
    clearFormData();
  };

  const handleClearComparison = () => {
    clearScenarios();
  };

  if (loadingFromUrl) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <FormSkeleton />
      </div>
    );
  }

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

  const { currentStep, totalSteps } = calculateProgress(formData);

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
          <BreadcrumbTrail formData={formData} options={options} />
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

      {/* Questions — single source of truth */}
      <ClassificationFormQuestions
        formData={formData}
        onUpdate={updateFormData}
      />

      {/* Error display */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

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
