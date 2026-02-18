import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Loader2, Sparkles } from 'lucide-react';
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
import { getLocalFormOptions } from '../../utils/formOptions';
import { useQuestionVisibility } from './useQuestionVisibility';
import { Button } from '@/components/ui/button';
import { QuestionCard, QuestionCardHeader, QuestionCardTitle, QuestionCardContent } from '@/components/ui/question-card';
import { SelectionCard } from '@/components/ui/selection-card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// QuestionAnswer represents a single answer in the user's decision path
export interface QuestionAnswer {
  question: string;
  answer: string;
  timestamp: number;
}

// AnswerTracking contains tracking data for divergence analysis
export interface AnswerTracking {
  answerPath: QuestionAnswer[];
  decisionPath: string;
  timePerQuestion: Record<string, number>;
  backClicks: number;
}

interface CaseClassificationFormProps {
  hasTACImages: boolean;
  onClassify: (input: FractureInput, tracking?: AnswerTracking) => Promise<ClassificationResult>;
}

export function CaseClassificationForm({ hasTACImages, onClassify }: CaseClassificationFormProps) {
  const { t, i18n } = useTranslation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const options = useMemo(() => getLocalFormOptions(), [i18n.language]);
  const [formState, setFormState] = useState<{
    data: Partial<FractureInput>;
    history: Partial<FractureInput>[];
    loading: boolean;
    error: string | null;
  }>(() => ({
    data: hasTACImages ? { has_ct_scan: true } : {},
    history: [],
    loading: false,
    error: null,
  }));
  const { data: formData, history: formHistory, loading, error } = formState;
  const setFormData = (data: Partial<FractureInput>) => setFormState(prev => ({ ...prev, data }));
  const setFormHistory = (updater: Partial<FractureInput>[] | ((prev: Partial<FractureInput>[]) => Partial<FractureInput>[])) =>
    setFormState(prev => ({ ...prev, history: typeof updater === 'function' ? updater(prev.history) : updater }));
  const formEndRef = useRef<HTMLDivElement>(null);

  // Answer tracking state consolidated for divergence analysis
  const startTimeRef = useRef<number>(Date.now());
  const [tracking, setTracking] = useState<{
    answerPath: QuestionAnswer[];
    questionStartTime: number;
    timePerQuestion: Record<string, number>;
    backClicks: number;
    currentQuestion: string | null;
  }>(() => ({
    answerPath: [],
    questionStartTime: Date.now(),
    timePerQuestion: {},
    backClicks: 0,
    currentQuestion: null,
  }));

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
  }, [formData]);

  // Go back to previous state
  const goBack = useCallback(() => {
    if (formHistory.length === 0) return;

    // Track back click for divergence analysis
    setTracking(prev => ({ ...prev, backClicks: prev.backClicks + 1 }));

    const previousState = formHistory[formHistory.length - 1];
    setFormHistory(prev => prev.slice(0, -1));
    setFormData(previousState);
  }, [formHistory]);

  const canGoBack = formHistory.length > 0;

  // Update form data helper with answer tracking
  const updateFormData = useCallback((newData: Partial<FractureInput>) => {
    const now = Date.now();

    setTracking(prev => {
      const elapsed = now - prev.questionStartTime;
      const newTimePerQuestion = prev.currentQuestion
        ? { ...prev.timePerQuestion, [prev.currentQuestion]: (prev.timePerQuestion[prev.currentQuestion] || 0) + elapsed }
        : prev.timePerQuestion;

      // Find what changed to record the answer
      const changedKeys = Object.keys(newData).filter(
        key => newData[key as keyof FractureInput] !== formData[key as keyof FractureInput]
      );

      const newAnswers: QuestionAnswer[] = [];
      let lastQuestion = prev.currentQuestion;
      for (const key of changedKeys) {
        const value = newData[key as keyof FractureInput];
        if (value !== undefined && value !== null) {
          newAnswers.push({ question: key, answer: String(value), timestamp: now - startTimeRef.current });
          lastQuestion = key;
        }
      }

      return {
        answerPath: [...prev.answerPath, ...newAnswers],
        questionStartTime: now,
        timePerQuestion: newTimePerQuestion,
        backClicks: prev.backClicks,
        currentQuestion: lastQuestion,
      };
    });

    pushToHistory();
    setFormData(newData);
  }, [pushToHistory, formData]);

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

  // Build decision path string from form data
  const buildDecisionPath = useCallback((): string => {
    const pathKeys = [
      'involved_malleoli',
      'fibular_level',
      'lateral_morphology',
      'medial_morphology',
      'suprasindesmal_type',
      'fibula_trace_pattern',
      'posterior_fracture_type'
    ] as const;

    return pathKeys
      .filter(key => formData[key] !== undefined && formData[key] !== null)
      .map(key => String(formData[key]))
      .join('→');
  }, [formData]);

  // Get answer tracking data
  const getAnswerTracking = useCallback((): AnswerTracking => ({
    answerPath: tracking.answerPath,
    decisionPath: buildDecisionPath(),
    timePerQuestion: tracking.timePerQuestion,
    backClicks: tracking.backClicks,
  }), [tracking, buildDecisionPath]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormComplete()) return;

    setFormState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Get answer tracking data for divergence analysis
      const answerTracking = getAnswerTracking();
      await onClassify(formData as FractureInput, answerTracking);
    } catch (err) {
      setFormState(prev => ({ ...prev, error: err instanceof Error ? err.message : 'Classification failed' }));
    } finally {
      setFormState(prev => ({ ...prev, loading: false }));
    }
  };

  const progress = calculateProgress();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Progress indicator */}
      {involvedMalleoli && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{t('form.progress')}</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Auto CT-scan indicator */}
      {hasTACImages && (
        <Alert className="border-primary/20 bg-primary/5">
          <Sparkles className="h-4 w-4 text-primary" />
          <AlertDescription className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-0">TAC</Badge>
            {t('cases.ctScanAutoDetected')}
          </AlertDescription>
        </Alert>
      )}

      {/* Back button */}
      {canGoBack && (
        <Button type="button" variant="ghost" size="sm" onClick={goBack} className="gap-1">
          <ChevronLeft className="h-4 w-4" />
          {t('form.back')}
        </Button>
      )}

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
                id={`malleoli-${option.value}`}
              />
            ))}
          </div>
        </QuestionCardContent>
      </QuestionCard>

      {/* CT Scan question (only if not auto-set from TAC images) */}
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
                id="ct-yes"
              />
              <SelectionCard
                value="no"
                label={options.labels.no}
                selected={formData.has_ct_scan === false}
                onSelect={() => updateFormData({ ...formData, has_ct_scan: false })}
                keyboardHint="2"
                id="ct-no"
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
                  id={`post-${option.value}`}
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
                  id={`medial-${option.value}`}
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
                  id={`fibular-${option.value}`}
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
                  id={`lateral-${option.value}`}
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
                  id={`supra-${option.value}`}
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
                  id={`trace-${option.value}`}
                />
              ))}
            </div>
          </QuestionCardContent>
        </QuestionCard>
      )}

      {/* Fibula Infrasindesmal Transverse (for lateral+medial path) */}
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
                id="infra-trans-yes"
              />
              <SelectionCard
                value="no"
                label={options.labels.no}
                selected={formData.fibula_infrasindesmal_transverse === false}
                onSelect={() => updateFormData({ ...formData, fibula_infrasindesmal_transverse: false })}
                keyboardHint="2"
                id="infra-trans-no"
              />
            </div>
          </QuestionCardContent>
        </QuestionCard>
      )}

      {/* Fibular Level for Transverse (lateral+medial path) */}
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
                  id={`fibular-trans-${option.value}`}
                />
              ))}
            </div>
          </QuestionCardContent>
        </QuestionCard>
      )}

      {/* Scroll anchor */}
      <div ref={formEndRef} />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Submit button */}
      <Button
        type="submit"
        size="lg"
        className={cn(
          "w-full font-semibold transition-shadow duration-300",
          isFormComplete() && "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
        )}
        disabled={!isFormComplete() || loading}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {t('form.classifying')}
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            {t('form.classify')}
          </>
        )}
      </Button>
    </form>
  );
}
