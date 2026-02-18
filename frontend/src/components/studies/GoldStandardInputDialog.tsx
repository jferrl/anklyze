import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Loader2, Target, Check, X } from 'lucide-react';
import type {
  FractureInput,
  ClassificationResult,
  InvolvedMalleoli,
  PosteriorFractureType,
  MedialMorphology,
  FibularLevel,
  LateralMorphology,
  SuprasindesmalType,
  FibulaTracePattern,
} from '@/types';
import { classifyFracture } from '@/services';
import { getLocalFormOptions } from '../../utils/formOptions';
import { useQuestionVisibility } from './useQuestionVisibility';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { QuestionCard, QuestionCardHeader, QuestionCardTitle, QuestionCardContent } from '@/components/ui/question-card';
import { SelectionCard } from '@/components/ui/selection-card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { ClassificationResult as ClassificationResultComponent } from '../ClassificationResult';

interface GoldStandardInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasTACImages: boolean;
  initialInput?: FractureInput;
  initialClassification?: ClassificationResult;
  onSave: (input: FractureInput, classification: ClassificationResult) => void;
}

export function GoldStandardInputDialog({
  open,
  onOpenChange,
  hasTACImages,
  initialInput,
  initialClassification,
  onSave,
}: GoldStandardInputDialogProps) {
  const { t, i18n } = useTranslation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const options = useMemo(() => getLocalFormOptions(), [i18n.language]);

  // Consolidated wizard state: form data, history, and classify operation
  type ClassifyState =
    | { status: 'idle'; result: ClassificationResult | null }
    | { status: 'loading'; result: null }
    | { status: 'error'; error: string; result: null }
    | { status: 'done'; result: ClassificationResult };

  interface WizardState {
    formData: Partial<FractureInput>;
    formHistory: Partial<FractureInput>[];
    classify: ClassifyState;
  }

  const buildInitialWizardState = (): WizardState => ({
    formData: initialInput ? { ...initialInput } : hasTACImages ? { has_ct_scan: true } : {},
    formHistory: [],
    classify: initialClassification
      ? { status: 'done', result: initialClassification }
      : { status: 'idle', result: null },
  });

  const [wizard, setWizard] = useState<WizardState>(buildInitialWizardState);
  const formEndRef = useRef<HTMLDivElement>(null);

  // Derive shortcuts for readability
  const { formData, formHistory, classify: classifyState } = wizard;

  // Helper setters that update individual wizard fields
  const setFormData = useCallback((data: Partial<FractureInput>) => {
    setWizard(prev => ({ ...prev, formData: data }));
  }, []);
  const setFormHistory = useCallback((updater: Partial<FractureInput>[] | ((prev: Partial<FractureInput>[]) => Partial<FractureInput>[])) => {
    setWizard(prev => ({
      ...prev,
      formHistory: typeof updater === 'function' ? updater(prev.formHistory) : updater,
    }));
  }, []);
  const setClassifyState = useCallback((state: ClassifyState) => {
    setWizard(prev => ({ ...prev, classify: state }));
  }, []);

  // Reset form when dialog opens — render-time state adjustment (React recommended pattern)
  // See: https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const [prevOpen, setPrevOpen] = useState(false);
  if (open && !prevOpen) {
    setPrevOpen(true);
    setWizard(buildInitialWizardState());
  }
  if (!open && prevOpen) {
    setPrevOpen(false);
  }

  // Smooth scroll to new question when form advances
  useEffect(() => {
    if (Object.keys(formData).length > 0 && formEndRef.current) {
      const timer = setTimeout(() => {
        formEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [formData]);

  // Push current state to history before making changes
  const pushToHistory = useCallback(() => {
    setFormHistory(prev => [...prev, { ...formData }]);
  }, [formData, setFormHistory]);

  // Go back to previous state
  const goBack = useCallback(() => {
    if (formHistory.length === 0) return;
    const previousState = formHistory[formHistory.length - 1];
    setFormHistory(prev => prev.slice(0, -1));
    setFormData(previousState);
    // Clear classification result when going back
    setClassifyState({ status: 'idle', result: null });
  }, [formHistory, setFormHistory, setFormData, setClassifyState]);

  const canGoBack = formHistory.length > 0;

  // Update form data helper
  const updateFormData = useCallback((newData: Partial<FractureInput>) => {
    pushToHistory();
    setFormData(newData);
    // Clear classification result when form changes
    setClassifyState({ status: 'idle', result: null });
  }, [pushToHistory, setFormData, setClassifyState]);

  // Shared question visibility logic, isFormComplete, and calculateProgress
  const {
    showPosteriorHasCTScan, showPosteriorType,
    showMedialMorphology,
    showLateralLevel, showLateralMorphologyTrans, showSuprasindesmalType, showLateralFibulaTracePattern,
    showLateralPosteriorLevel, showLPMorphologyTrans,
    showLPHasCTScanTransSpiral, showLPPosteriorTypeTransSpiral,
    showLPHasCTScanTransOblique, showLPPosteriorTypeTransOblique,
    showLPSuprasindesmalType, showLPFibulaTracePattern,
    showLPHasCTScanSupra, showLPPosteriorTypeSupra,
    showLMMedialMorphology, showLMFibulaInfraTransverse, showLMFibularLevel,
    showLMSuprasindesmalType, showLMFibulaTracePattern, showLMFibularMorphology,
    showMedialPosteriorMorphology, showMPHasCTScan, showMPPosteriorType,
    showTrimaleolarFibularHeight, showTrimaleolarSupraType, showTriFibulaTracePattern,
    showTriHasCTScan, showTriPosteriorType, showTriLateralMorphologyTransComplete,
    isFormComplete, calculateProgress,
  } = useQuestionVisibility(formData, hasTACImages);

  const involvedMalleoli = formData.involved_malleoli;

  // Handle classification
  const handleClassify = async () => {
    if (!isFormComplete()) return;

    setClassifyState({ status: 'loading', result: null });

    try {
      const result = await classifyFracture(formData as FractureInput);
      setClassifyState({ status: 'done', result });
    } catch (err) {
      setClassifyState({ status: 'error', error: err instanceof Error ? err.message : 'Classification failed', result: null });
    }
  };

  // Handle save
  const handleSave = () => {
    if (classifyState.status !== 'done' || !isFormComplete()) return;
    onSave(formData as FractureInput, classifyState.result);
    onOpenChange(false);
  };

  const progress = calculateProgress();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {t('admin.studies.configureGoldStandardInput')}
          </DialogTitle>
          <DialogDescription>
            {t('admin.studies.configureGoldStandardInputDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress indicator */}
          {involvedMalleoli && classifyState.status !== 'done' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{t('form.progress')}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Back button */}
          {canGoBack && classifyState.status !== 'done' && (
            <Button type="button" variant="ghost" size="sm" onClick={goBack} className="gap-1">
              <ChevronLeft className="h-4 w-4" />
              {t('form.back')}
            </Button>
          )}

          {/* Show classification result if available */}
          {classifyState.status === 'done' ? (
            <div className="space-y-6">
              <Alert className="border-emerald-500/30 bg-emerald-500/10">
                <Check className="h-4 w-4 text-emerald-600" />
                <AlertDescription className="text-emerald-700 dark:text-emerald-300">
                  {t('admin.studies.goldStandardClassified')}
                </AlertDescription>
              </Alert>

              <ClassificationResultComponent result={classifyState.result} />

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setClassifyState({ status: 'idle', result: null });
                    setFormData({});
                    setFormHistory([]);
                  }}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  {t('admin.studies.startOver')}
                </Button>
                <Button onClick={handleSave} className="flex-1 gap-2">
                  <Check className="h-4 w-4" />
                  {t('admin.studies.saveAsGoldStandard')}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Question 1: Involved Malleoli */}
              <QuestionCard questionKey="involved_malleoli">
                <QuestionCardHeader>
                  <QuestionCardTitle>
                    {options.questions.involved_malleoli?.title}
                  </QuestionCardTitle>
                </QuestionCardHeader>
                <QuestionCardContent>
                  <div className="grid gap-3" role="radiogroup" aria-label={options.questions.involved_malleoli?.title}>
                    {options.involved_malleoli.map((option, index) => (
                      <SelectionCard
                        key={option.value}
                        value={option.value}
                        label={option.label}
                        selected={formData.involved_malleoli === option.value}
                        onSelect={() => updateFormData({
                          involved_malleoli: option.value as InvolvedMalleoli,
                          ...(hasTACImages ? { has_ct_scan: true } : {})
                        })}
                        keyboardHint={`${index + 1}`}
                        id={`gs-malleoli-${option.value}`}
                      />
                    ))}
                  </div>
                </QuestionCardContent>
              </QuestionCard>

              {/* CT Scan question */}
              {(showPosteriorHasCTScan || showMPHasCTScan || showLPHasCTScanTransSpiral ||
                showLPHasCTScanTransOblique || showLPHasCTScanSupra || showTriHasCTScan) && (
                <QuestionCard questionKey="has_ct_scan">
                  <QuestionCardHeader>
                    <QuestionCardTitle>
                      {options.questions.has_ct_scan?.title}
                    </QuestionCardTitle>
                  </QuestionCardHeader>
                  <QuestionCardContent>
                    <div className="grid gap-3" role="radiogroup" aria-label={options.questions.has_ct_scan?.title}>
                      <SelectionCard
                        value="yes"
                        label={options.labels.yes}
                        selected={formData.has_ct_scan === true}
                        onSelect={() => updateFormData({ ...formData, has_ct_scan: true })}
                        keyboardHint="1"
                        id="gs-ct-yes"
                      />
                      <SelectionCard
                        value="no"
                        label={options.labels.no}
                        selected={formData.has_ct_scan === false}
                        onSelect={() => updateFormData({ ...formData, has_ct_scan: false })}
                        keyboardHint="2"
                        id="gs-ct-no"
                      />
                    </div>
                  </QuestionCardContent>
                </QuestionCard>
              )}

              {/* Posterior Fracture Type */}
              {(showPosteriorType || showMPPosteriorType || showLPPosteriorTypeTransSpiral ||
                showLPPosteriorTypeTransOblique || showLPPosteriorTypeSupra || showTriPosteriorType) && (
                <QuestionCard questionKey="posterior_fracture_type">
                  <QuestionCardHeader>
                    <QuestionCardTitle>
                      {options.questions.posterior_fracture_type?.title}
                    </QuestionCardTitle>
                  </QuestionCardHeader>
                  <QuestionCardContent>
                    <div className="grid gap-3" role="radiogroup" aria-label={options.questions.posterior_fracture_type?.title}>
                      {options.posterior_fracture_types.map((option, index) => (
                        <SelectionCard
                          key={option.value}
                          value={option.value}
                          label={option.label}
                          selected={formData.posterior_fracture_type === option.value}
                          onSelect={() => updateFormData({ ...formData, posterior_fracture_type: option.value as PosteriorFractureType })}
                          keyboardHint={`${index + 1}`}
                          id={`gs-post-${option.value}`}
                        />
                      ))}
                    </div>
                  </QuestionCardContent>
                </QuestionCard>
              )}

              {/* Medial Morphology */}
              {(showMedialMorphology || showMedialPosteriorMorphology || showLMMedialMorphology) && (
                <QuestionCard questionKey="medial_morphology">
                  <QuestionCardHeader>
                    <QuestionCardTitle>
                      {showLMMedialMorphology ? options.questions.medial_morphology_lm?.title : options.questions.medial_morphology?.title}
                    </QuestionCardTitle>
                  </QuestionCardHeader>
                  <QuestionCardContent>
                    <div className="grid gap-3" role="radiogroup" aria-label={showLMMedialMorphology ? options.questions.medial_morphology_lm?.title : options.questions.medial_morphology?.title}>
                      {(showLMMedialMorphology ? options.medial_morphology_lm : options.medial_morphology).map((option, index) => (
                        <SelectionCard
                          key={option.value}
                          value={option.value}
                          label={option.label}
                          selected={formData.medial_morphology === option.value}
                          onSelect={() => updateFormData({ ...formData, medial_morphology: option.value as MedialMorphology })}
                          keyboardHint={`${index + 1}`}
                          id={`gs-medial-${option.value}`}
                        />
                      ))}
                    </div>
                  </QuestionCardContent>
                </QuestionCard>
              )}

              {/* Fibular Level */}
              {(showLateralLevel || showLateralPosteriorLevel || showTrimaleolarFibularHeight) && (
                <QuestionCard questionKey="fibular_level">
                  <QuestionCardHeader>
                    <QuestionCardTitle>
                      {options.questions.fibular_level?.title}
                    </QuestionCardTitle>
                  </QuestionCardHeader>
                  <QuestionCardContent>
                    <div className="grid gap-3" role="radiogroup" aria-label={options.questions.fibular_level?.title}>
                      {options.fibular_levels.map((option, index) => (
                        <SelectionCard
                          key={option.value}
                          value={option.value}
                          label={option.label}
                          selected={formData.fibular_level === option.value}
                          onSelect={() => updateFormData({ ...formData, fibular_level: option.value as FibularLevel })}
                          keyboardHint={`${index + 1}`}
                          id={`gs-fibular-${option.value}`}
                        />
                      ))}
                    </div>
                  </QuestionCardContent>
                </QuestionCard>
              )}

              {/* Lateral Morphology */}
              {(showLateralMorphologyTrans || showLPMorphologyTrans || showTriLateralMorphologyTransComplete || showLMFibularMorphology) && (
                <QuestionCard questionKey="lateral_morphology">
                  <QuestionCardHeader>
                    <QuestionCardTitle>
                      {options.questions.lateral_morphology?.title}
                    </QuestionCardTitle>
                  </QuestionCardHeader>
                  <QuestionCardContent>
                    <div className="grid gap-3" role="radiogroup" aria-label={options.questions.lateral_morphology?.title}>
                      {((showLMFibularMorphology || showTriLateralMorphologyTransComplete) ? options.fibula_morphology_lm_tri : options.lateral_morphology).map((option, index) => (
                        <SelectionCard
                          key={option.value}
                          value={option.value}
                          label={option.label}
                          selected={formData.lateral_morphology === option.value}
                          onSelect={() => updateFormData({ ...formData, lateral_morphology: option.value as LateralMorphology })}
                          keyboardHint={`${index + 1}`}
                          id={`gs-lateral-${option.value}`}
                        />
                      ))}
                    </div>
                  </QuestionCardContent>
                </QuestionCard>
              )}

              {/* Suprasindesmal Type */}
              {(showSuprasindesmalType || showLPSuprasindesmalType || showTrimaleolarSupraType || showLMSuprasindesmalType) && (
                <QuestionCard questionKey="suprasindesmal_type">
                  <QuestionCardHeader>
                    <QuestionCardTitle>
                      {options.questions.suprasindesmal_type?.title}
                    </QuestionCardTitle>
                  </QuestionCardHeader>
                  <QuestionCardContent>
                    <div className="grid gap-3" role="radiogroup" aria-label={options.questions.suprasindesmal_type?.title}>
                      {options.suprasindesmal_types.map((option, index) => (
                        <SelectionCard
                          key={option.value}
                          value={option.value}
                          label={option.label}
                          selected={formData.suprasindesmal_type === option.value}
                          onSelect={() => updateFormData({ ...formData, suprasindesmal_type: option.value as SuprasindesmalType })}
                          keyboardHint={`${index + 1}`}
                          id={`gs-supra-${option.value}`}
                        />
                      ))}
                    </div>
                  </QuestionCardContent>
                </QuestionCard>
              )}

              {/* Fibula Trace Pattern */}
              {(showLateralFibulaTracePattern || showLPFibulaTracePattern || showTriFibulaTracePattern || showLMFibulaTracePattern) && (
                <QuestionCard questionKey="fibula_trace_pattern">
                  <QuestionCardHeader>
                    <QuestionCardTitle>
                      {options.questions.fibula_trace_pattern?.title}
                    </QuestionCardTitle>
                  </QuestionCardHeader>
                  <QuestionCardContent>
                    <div className="grid gap-3" role="radiogroup" aria-label={options.questions.fibula_trace_pattern?.title}>
                      {options.fibula_trace_patterns.map((option, index) => (
                        <SelectionCard
                          key={option.value}
                          value={option.value}
                          label={option.label}
                          selected={formData.fibula_trace_pattern === option.value}
                          onSelect={() => updateFormData({ ...formData, fibula_trace_pattern: option.value as FibulaTracePattern })}
                          keyboardHint={`${index + 1}`}
                          id={`gs-trace-${option.value}`}
                        />
                      ))}
                    </div>
                  </QuestionCardContent>
                </QuestionCard>
              )}

              {/* Fibula Infrasindesmal Transverse */}
              {showLMFibulaInfraTransverse && (
                <QuestionCard questionKey="fibula_infrasindesmal_transverse">
                  <QuestionCardHeader>
                    <QuestionCardTitle>
                      {options.questions.fibula_infrasindesmal_transverse?.title}
                    </QuestionCardTitle>
                  </QuestionCardHeader>
                  <QuestionCardContent>
                    <div className="grid gap-3" role="radiogroup" aria-label={options.questions.fibula_infrasindesmal_transverse?.title}>
                      <SelectionCard
                        value="yes"
                        label={options.labels.yes}
                        selected={formData.fibula_infrasindesmal_transverse === true}
                        onSelect={() => updateFormData({ ...formData, fibula_infrasindesmal_transverse: true })}
                        keyboardHint="1"
                        id="gs-infra-trans-yes"
                      />
                      <SelectionCard
                        value="no"
                        label={options.labels.no}
                        selected={formData.fibula_infrasindesmal_transverse === false}
                        onSelect={() => updateFormData({ ...formData, fibula_infrasindesmal_transverse: false })}
                        keyboardHint="2"
                        id="gs-infra-trans-no"
                      />
                    </div>
                  </QuestionCardContent>
                </QuestionCard>
              )}

              {/* Fibular Level for Transverse */}
              {showLMFibularLevel && (
                <QuestionCard questionKey="fibular_level_for_transverse">
                  <QuestionCardHeader>
                    <QuestionCardTitle>
                      {options.questions.fibular_level_lm?.title || options.questions.fibular_level?.title}
                    </QuestionCardTitle>
                  </QuestionCardHeader>
                  <QuestionCardContent>
                    <div className="grid gap-3" role="radiogroup" aria-label={options.questions.fibular_level_lm?.title || options.questions.fibular_level?.title}>
                      {options.fibular_levels.map((option, index) => (
                        <SelectionCard
                          key={option.value}
                          value={option.value}
                          label={option.label}
                          selected={formData.fibular_level_for_transverse === option.value}
                          onSelect={() => updateFormData({ ...formData, fibular_level_for_transverse: option.value as FibularLevel })}
                          keyboardHint={`${index + 1}`}
                          id={`gs-fibular-trans-${option.value}`}
                        />
                      ))}
                    </div>
                  </QuestionCardContent>
                </QuestionCard>
              )}

              {/* Scroll anchor */}
              <div ref={formEndRef} />

              {classifyState.status === 'error' && (
                <Alert variant="destructive">
                  <AlertDescription>{classifyState.error}</AlertDescription>
                </Alert>
              )}

              {/* Classify button */}
              <Button
                type="button"
                size="lg"
                className={cn(
                  "w-full font-semibold transition-shadow duration-300",
                  isFormComplete() && "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
                )}
                disabled={!isFormComplete() || classifyState.status === 'loading'}
                onClick={handleClassify}
              >
                {classifyState.status === 'loading' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('form.classifying')}
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4 mr-2" />
                    {t('admin.studies.classifyGoldStandard')}
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
