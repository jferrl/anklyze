import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Loader2, Sparkles } from 'lucide-react';
import type { FractureInput, ClassificationResult } from '@/types';
import { isFormComplete, calculateProgress } from '@/features/fracture-classification/utils/formValidation';
import { ClassificationFormQuestions } from '@/features/fracture-classification/components/ClassificationFormQuestions';
import { Button } from '@/components/ui/button';
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
  const { t } = useTranslation();

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

  // Answer tracking state for divergence analysis
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

  const canGoBack = formHistory.length > 0;

  const goBack = useCallback(() => {
    if (formHistory.length === 0) return;
    setTracking(prev => ({ ...prev, backClicks: prev.backClicks + 1 }));
    const previousState = formHistory[formHistory.length - 1];
    setFormState(prev => ({
      ...prev,
      data: previousState,
      history: prev.history.slice(0, -1),
    }));
  }, [formHistory]);

  // Called by ClassificationFormQuestions when user selects an answer
  const handleUpdate = useCallback((newData: Partial<FractureInput>) => {
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

    setFormState(prev => ({
      ...prev,
      data: newData,
      history: [...prev.history, { ...prev.data }],
    }));
  }, [formData]);

  // Build decision path string from form data
  const buildDecisionPath = useCallback((): string => {
    const pathKeys = [
      'involved_malleoli', 'fibular_level', 'lateral_morphology',
      'medial_morphology', 'suprasindesmal_type', 'fibula_trace_pattern',
      'posterior_fracture_type',
    ] as const;

    return pathKeys
      .filter(key => formData[key] !== undefined && formData[key] !== null)
      .map(key => String(formData[key]))
      .join('→');
  }, [formData]);

  const getAnswerTracking = useCallback((): AnswerTracking => ({
    answerPath: tracking.answerPath,
    decisionPath: buildDecisionPath(),
    timePerQuestion: tracking.timePerQuestion,
    backClicks: tracking.backClicks,
  }), [tracking, buildDecisionPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormComplete(formData)) return;

    setFormState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const answerTracking = getAnswerTracking();
      await onClassify(formData as FractureInput, answerTracking);
    } catch (err) {
      setFormState(prev => ({ ...prev, error: err instanceof Error ? err.message : 'Classification failed' }));
    } finally {
      setFormState(prev => ({ ...prev, loading: false }));
    }
  };

  const { currentStep, totalSteps } = calculateProgress(formData);
  const progress = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Progress indicator */}
      {formData.involved_malleoli && (
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

      {/* Questions — single source of truth */}
      <ClassificationFormQuestions
        formData={formData}
        onUpdate={handleUpdate}
        hasTACImages={hasTACImages}
      />

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
          isFormComplete(formData) && "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
        )}
        disabled={!isFormComplete(formData) || loading}
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
