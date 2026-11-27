import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Workflow, ArrowLeft, RotateCcw, ChevronDown } from 'lucide-react';
import { Button, FormSkeleton } from '@/components/ui';
import { ComparisonView } from '@/components/ComparisonView';
import { PageHeader } from '@/components/layout/PageHeader';
import { AnatomyView } from '@/components/anatomy/AnatomyView';
import { AnatomySnapshotPair } from '@/components/anatomy/AnatomySnapshotPair';
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
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';

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
  const [showAnatomy, setShowAnatomy] = useState(false);

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

  const doSubmit = async () => {
    if (!isFormComplete(formData) || loading) return;
    try {
      setLastInput(formData as FractureInput);
      await classify(formData as FractureInput);
    } catch {
      // Error already handled by useClassification
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await doSubmit();
  };

  // Keyboard shortcuts: 1-9 select, Enter submit, Backspace go back
  useKeyboardNavigation({
    onGoBack: goBack,
    onSubmit: doSubmit,
    canSubmit: isFormComplete(formData) && !loading,
    canGoBack,
    enabled: !result && !loading,
  });

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

  const header = (actions?: React.ReactNode) => (
    <PageHeader title={t('app.title')} description={t('app.description')} actions={actions} />
  );

  if (loadingFromUrl) {
    return (
      <div className="space-y-6">
        {header()}
        <FormSkeleton className="max-w-2xl" />
      </div>
    );
  }

  if (scenarios.length >= 2) {
    return (
      <div className="space-y-6">
        {header()}
        <ComparisonView scenarios={scenarios} />
        <div className="flex flex-wrap gap-2">
          {scenarios.length < 3 && (
            <Button onClick={handleStartComparison} variant="outline">
              {t('comparison.addAnother')}
            </Button>
          )}
          <Button onClick={handleClearComparison} variant="outline">
            {t('comparison.clear')}
          </Button>
          <Button onClick={handleStartOver}>
            {t('comparison.startOver')}
          </Button>
        </div>
      </div>
    );
  }

  if (result && lastInput) {
    return (
      <div className="space-y-6">
        {header()}
        <section className="space-y-4">
          <h2 className="text-base font-semibold">{t('classify.pathTitle')}</h2>
          <BreadcrumbTrail variant="list" formData={lastInput} options={options} />
        </section>
        {/* The marked AP and Lateral pair sits beside the four results, as the figure last drew it. */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
          <ResultsPanel
            result={result}
            input={lastInput}
            onReset={handleReset}
            onCompare={handleStartComparison}
          />
          <AnatomySnapshotPair formData={lastInput} />
        </div>
      </div>
    );
  }

  const { currentStep, totalSteps } = calculateProgress(formData);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {header(
        formData.involved_malleoli && (
          <Button type="button" variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            {t('form.reset')}
          </Button>
        )
      )}

      <div className="lg:grid lg:grid-cols-[minmax(0,42rem)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <div className="max-w-2xl space-y-6">
          {formData.involved_malleoli && (
            <div className="space-y-3">
              <FormProgress
                currentStep={currentStep}
                totalSteps={totalSteps}
                showStepCounter={false}
              />
              <BreadcrumbTrail formData={formData} options={options} className="lg:hidden" />
              {/* Below lg the figure would push the questions down, so it waits behind a disclosure. */}
              <div className="lg:hidden">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-expanded={showAnatomy}
                  aria-controls="anatomy-mobile"
                  onClick={() => setShowAnatomy((open) => !open)}
                  className="-ml-2 gap-1.5"
                >
                  {showAnatomy ? t('anatomy.hide') : t('anatomy.show')}
                  <ChevronDown className={showAnatomy ? 'h-4 w-4 rotate-180' : 'h-4 w-4'} />
                </Button>
                {/* Hidden, not unmounted, when closed: the model and its camera survive every answer. */}
                <div id="anatomy-mobile" className={showAnatomy ? 'mt-2 rounded-lg border bg-card p-4' : 'hidden'}>
                  <AnatomyView formData={formData} showReading={false} fracture />
                </div>
              </div>
            </div>
          )}

          {canGoBack && formData.involved_malleoli && (
            <Button type="button" variant="ghost" onClick={goBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t('form.back')}
            </Button>
          )}

          {/* Questions — single source of truth */}
          <ClassificationFormQuestions
            formData={formData}
            onUpdate={updateFormData}
          />

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-4">
            <Button
              type="submit"
              disabled={!isFormComplete(formData) || loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Workflow className="h-4 w-4" />
              )}
              {loading ? t('form.classifying') : t('form.classify')}
            </Button>
            <p className="text-xs text-muted-foreground">{t('form.keyboardHint')}</p>
          </div>
        </div>

        <aside className="hidden space-y-6 lg:sticky lg:top-16 lg:block lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto">
          <section className="space-y-3">
            <h2 className="text-base font-semibold">{t('anatomy.title')}</h2>
            <div className="rounded-lg border bg-card p-4">
              {/* The path list below is the reading, so the figure does not repeat it. */}
              <AnatomyView formData={formData} showReading={false} fracture />
            </div>
          </section>
          <section className="space-y-3">
            <h2 className="text-base font-semibold">{t('classify.pathTitle')}</h2>
            {formData.involved_malleoli ? (
              <BreadcrumbTrail variant="list" formData={formData} options={options} />
            ) : (
              <p className="text-sm text-muted-foreground">{t('classify.pathEmpty')}</p>
            )}
          </section>
        </aside>
      </div>
    </form>
  );
}
