import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Loader2, Sparkles } from 'lucide-react';
import type {
  FractureInput,
  FormOptions,
  ClassificationResult,
  InvolvedMalleoli,
  PosteriorFractureType,
  MedialMorphology,
  FibularLevel,
  LateralMorphology,
  SuprasindesmalType,
  FibulaTracePattern,
} from '../../types/fracture';
import { getFormOptions } from '../../services/api';
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

interface StudyClassificationFormProps {
  hasTACImages: boolean;
  onClassify: (input: FractureInput, tracking?: AnswerTracking) => Promise<ClassificationResult>;
}

export function StudyClassificationForm({ hasTACImages, onClassify }: StudyClassificationFormProps) {
  const { t, i18n } = useTranslation();
  const [options, setOptions] = useState<FormOptions | null>(null);
  const [formData, setFormData] = useState<Partial<FractureInput>>(() => {
    // Auto-set has_ct_scan if study has TAC images
    if (hasTACImages) {
      return { has_ct_scan: true };
    }
    return {};
  });
  const [formHistory, setFormHistory] = useState<Partial<FractureInput>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formEndRef = useRef<HTMLDivElement>(null);

  // Answer tracking state for divergence analysis
  const startTimeRef = useRef<number>(Date.now());
  const [answerPath, setAnswerPath] = useState<QuestionAnswer[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [timePerQuestion, setTimePerQuestion] = useState<Record<string, number>>({});
  const [backClicks, setBackClicks] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);

  // Re-fetch options when language changes
  useEffect(() => {
    getFormOptions().then(setOptions).catch(console.error);
  }, [i18n.language]);

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
    setBackClicks(prev => prev + 1);

    const previousState = formHistory[formHistory.length - 1];
    setFormHistory(prev => prev.slice(0, -1));
    setFormData(previousState);
  }, [formHistory]);

  const canGoBack = formHistory.length > 0;

  // Update form data helper with answer tracking
  const updateFormData = useCallback((newData: Partial<FractureInput>) => {
    const now = Date.now();
    const elapsed = now - questionStartTime;

    // Record time spent on previous question
    if (currentQuestion) {
      setTimePerQuestion(prev => ({
        ...prev,
        [currentQuestion]: (prev[currentQuestion] || 0) + elapsed
      }));
    }

    // Find what changed to record the answer
    const changedKeys = Object.keys(newData).filter(
      key => newData[key as keyof FractureInput] !== formData[key as keyof FractureInput]
    );

    // Record each new answer
    for (const key of changedKeys) {
      const value = newData[key as keyof FractureInput];
      if (value !== undefined && value !== null) {
        setAnswerPath(prev => [...prev, {
          question: key,
          answer: String(value),
          timestamp: now - startTimeRef.current
        }]);
        // Update current question for time tracking
        setCurrentQuestion(key);
      }
    }

    // Reset timer for next question
    setQuestionStartTime(now);

    pushToHistory();
    setFormData(newData);
  }, [pushToHistory, questionStartTime, currentQuestion, formData]);

  // Determine which questions to show
  const involvedMalleoli = formData.involved_malleoli;

  // PATH: Posterior only - CT scan question (auto-answered if TAC images)
  const showPosteriorHasCTScan = involvedMalleoli === 'posterior_only' && !hasTACImages;
  const showPosteriorType = involvedMalleoli === 'posterior_only' && formData.has_ct_scan === true;

  // PATH: Medial only
  const showMedialMorphology = involvedMalleoli === 'medial_only';

  // PATH: Lateral only
  const showLateralLevel = involvedMalleoli === 'lateral_only';
  const showLateralMorphologyTrans = showLateralLevel && formData.fibular_level === 'transindesmal';
  const showSuprasindesmalType = showLateralLevel && formData.fibular_level === 'suprasindesmal';
  const showLateralFibulaTracePattern = showSuprasindesmalType &&
    (formData.suprasindesmal_type === 'simple_diaphyseal' || formData.suprasindesmal_type === 'multifragmentary');

  // PATH: Lateral + Posterior
  const showLateralPosteriorLevel = involvedMalleoli === 'lateral_posterior';
  const showLPMorphologyTrans = showLateralPosteriorLevel && formData.fibular_level === 'transindesmal';
  const showLPHasCTScanTransSpiral = showLPMorphologyTrans && formData.lateral_morphology === 'spiral' && !hasTACImages;
  const showLPPosteriorTypeTransSpiral = showLPMorphologyTrans && formData.lateral_morphology === 'spiral' && formData.has_ct_scan === true;
  const showLPHasCTScanTransOblique = showLPMorphologyTrans && formData.lateral_morphology === 'oblique' && !hasTACImages;
  const showLPPosteriorTypeTransOblique = showLPMorphologyTrans && formData.lateral_morphology === 'oblique' && formData.has_ct_scan === true;
  const showLPSuprasindesmalType = showLateralPosteriorLevel && formData.fibular_level === 'suprasindesmal';
  const showLPFibulaTracePattern = showLPSuprasindesmalType &&
    (formData.suprasindesmal_type === 'simple_diaphyseal' || formData.suprasindesmal_type === 'multifragmentary');
  const showLPHasCTScanSupra = (showLPFibulaTracePattern ||
    (showLPSuprasindesmalType && formData.suprasindesmal_type === 'proximal')) && !hasTACImages;
  const showLPPosteriorTypeSupra = (showLPFibulaTracePattern ||
    (showLPSuprasindesmalType && formData.suprasindesmal_type === 'proximal')) && formData.has_ct_scan === true;

  // PATH: Lateral + Medial
  const showLMMedialMorphology = involvedMalleoli === 'lateral_medial';
  const showLMFibulaInfraTransverse = showLMMedialMorphology && formData.medial_morphology === 'oblique';
  const showLMFibularLevel = showLMMedialMorphology && (
    (formData.medial_morphology === 'oblique' && formData.fibula_infrasindesmal_transverse === false) ||
    formData.medial_morphology === 'transverse'
  );
  const showLMSuprasindesmalType = showLMFibularLevel && formData.fibular_level_for_transverse === 'suprasindesmal';
  const showLMFibulaTracePattern = showLMSuprasindesmalType &&
    (formData.suprasindesmal_type === 'simple_diaphyseal' || formData.suprasindesmal_type === 'multifragmentary');
  const showLMFibularMorphology = showLMFibularLevel &&
    (formData.fibular_level_for_transverse === 'infrasindesmal' || formData.fibular_level_for_transverse === 'transindesmal');

  // PATH: Medial + Posterior
  const showMedialPosteriorMorphology = involvedMalleoli === 'medial_posterior';
  const showMPHasCTScan = showMedialPosteriorMorphology && !hasTACImages;
  const showMPPosteriorType = showMedialPosteriorMorphology && formData.has_ct_scan === true;

  // PATH: Trimaleolar
  const showTrimaleolarFibularHeight = involvedMalleoli === 'trimaleolar';
  const showTrimaleolarSupraType = showTrimaleolarFibularHeight && formData.fibular_level === 'suprasindesmal';
  const showTriFibulaTracePattern = showTrimaleolarSupraType &&
    (formData.suprasindesmal_type === 'simple_diaphyseal' || formData.suprasindesmal_type === 'multifragmentary');
  const showTriHasCTScan = (showTriFibulaTracePattern ||
    (showTrimaleolarSupraType && formData.suprasindesmal_type === 'proximal') ||
    (showTrimaleolarFibularHeight && (formData.fibular_level === 'infrasindesmal' || formData.fibular_level === 'transindesmal'))) && !hasTACImages;
  const showTriPosteriorType = showTriHasCTScan === false && showTrimaleolarFibularHeight && formData.has_ct_scan === true;
  const showTriLateralMorphologyTrans = showTrimaleolarFibularHeight && formData.fibular_level === 'transindesmal';
  const showTriLateralMorphologyTransComplete = showTriLateralMorphologyTrans && (formData.has_ct_scan === true || hasTACImages);

  // Calculate progress
  const calculateProgress = useCallback((): number => {
    if (!involvedMalleoli) return 0;

    let totalSteps = 1; // involved_malleoli is always step 1
    let completedSteps = 1;

    // Different paths have different numbers of steps
    switch (involvedMalleoli) {
      case 'posterior_only':
        totalSteps = formData.has_ct_scan ? 3 : 2;
        if (formData.has_ct_scan !== undefined) completedSteps++;
        if (formData.posterior_fracture_type) completedSteps++;
        break;
      case 'medial_only':
        totalSteps = 2;
        if (formData.medial_morphology) completedSteps++;
        break;
      case 'lateral_only':
        totalSteps = 3;
        if (formData.fibular_level) completedSteps++;
        if (formData.lateral_morphology || formData.suprasindesmal_type) completedSteps++;
        break;
      default:
        totalSteps = 4;
        completedSteps = Math.min(Object.keys(formData).length, totalSteps);
    }

    return Math.round((completedSteps / totalSteps) * 100);
  }, [involvedMalleoli, formData]);

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
    answerPath,
    decisionPath: buildDecisionPath(),
    timePerQuestion,
    backClicks
  }), [answerPath, buildDecisionPath, timePerQuestion, backClicks]);

  // Check if form is complete
  const isFormComplete = useCallback((): boolean => {
    if (!involvedMalleoli) return false;

    // Simplified completion check based on path
    switch (involvedMalleoli) {
      case 'posterior_only':
        if (formData.has_ct_scan === undefined) return false;
        if (formData.has_ct_scan === false) return true;
        return !!formData.posterior_fracture_type;

      case 'medial_only':
        return !!formData.medial_morphology;

      case 'lateral_only':
        if (!formData.fibular_level) return false;
        if (formData.fibular_level === 'infrasindesmal') return true;
        if (formData.fibular_level === 'transindesmal') return !!formData.lateral_morphology;
        if (formData.fibular_level === 'suprasindesmal') {
          if (!formData.suprasindesmal_type) return false;
          if (formData.suprasindesmal_type === 'proximal') return true;
          return !!formData.fibula_trace_pattern;
        }
        return false;

      case 'medial_posterior':
        if (formData.has_ct_scan === undefined) return false;
        if (formData.has_ct_scan === false) return !!formData.medial_morphology;
        return !!formData.medial_morphology && !!formData.posterior_fracture_type;

      case 'lateral_posterior':
        if (!formData.fibular_level) return false;
        return true;

      case 'lateral_medial':
        if (!formData.medial_morphology) return false;
        return true;

      case 'trimaleolar':
        if (!formData.fibular_level) return false;
        return true;

      default:
        return false;
    }
  }, [involvedMalleoli, formData]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormComplete()) return;

    setLoading(true);
    setError(null);

    try {
      // Get answer tracking data for divergence analysis
      const tracking = getAnswerTracking();
      await onClassify(formData as FractureInput, tracking);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Classification failed');
    } finally {
      setLoading(false);
    }
  };

  if (!options) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

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
            {t('studies.ctScanAutoDetected')}
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
              {options.questions.medial_morphology?.title}
            </QuestionCardTitle>
          </QuestionCardHeader>
          <QuestionCardContent>
            <div className="grid gap-3" role="radiogroup" aria-label={options.questions.medial_morphology?.title}>
              {options.medial_morphology.map((option, index) => (
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
              {options.lateral_morphology.map((option, index) => (
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
          "w-full font-semibold transition-all duration-300",
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
