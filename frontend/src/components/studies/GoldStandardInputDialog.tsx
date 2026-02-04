import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Loader2, Target, Check, X } from 'lucide-react';
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
} from '@/types';
import { classifyFracture } from '@/services';
import { getLocalFormOptions } from '../../utils/formOptions';
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
  const [options, setOptions] = useState<FormOptions | null>(null);
  const [formData, setFormData] = useState<Partial<FractureInput>>(() => {
    if (initialInput) return { ...initialInput };
    if (hasTACImages) return { has_ct_scan: true };
    return {};
  });
  const [formHistory, setFormHistory] = useState<Partial<FractureInput>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [classificationResult, setClassificationResult] = useState<ClassificationResult | null>(
    initialClassification || null
  );
  const formEndRef = useRef<HTMLDivElement>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (initialInput) {
        setFormData({ ...initialInput });
      } else if (hasTACImages) {
        setFormData({ has_ct_scan: true });
      } else {
        setFormData({});
      }
      setFormHistory([]);
      setClassificationResult(initialClassification || null);
      setError(null);
    }
  }, [open, initialInput, initialClassification, hasTACImages]);

  // Re-load options when language changes
  useEffect(() => {
    setOptions(getLocalFormOptions());
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
    const previousState = formHistory[formHistory.length - 1];
    setFormHistory(prev => prev.slice(0, -1));
    setFormData(previousState);
    // Clear classification result when going back
    setClassificationResult(null);
  }, [formHistory]);

  const canGoBack = formHistory.length > 0;

  // Update form data helper
  const updateFormData = useCallback((newData: Partial<FractureInput>) => {
    pushToHistory();
    setFormData(newData);
    // Clear classification result when form changes
    setClassificationResult(null);
  }, [pushToHistory]);

  // Determine which questions to show (same logic as StudyClassificationForm)
  const involvedMalleoli = formData.involved_malleoli;

  // PATH: Posterior only
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

    let totalSteps = 1;
    let completedSteps = 1;

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

  // Check if form is complete
  const isFormComplete = useCallback((): boolean => {
    if (!involvedMalleoli) return false;

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

  // Handle classification
  const handleClassify = async () => {
    if (!isFormComplete()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await classifyFracture(formData as FractureInput);
      setClassificationResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Classification failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle save
  const handleSave = () => {
    if (!classificationResult || !isFormComplete()) return;
    onSave(formData as FractureInput, classificationResult);
    onOpenChange(false);
  };

  if (!options) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

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
          {involvedMalleoli && !classificationResult && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{t('form.progress')}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Back button */}
          {canGoBack && !classificationResult && (
            <Button type="button" variant="ghost" size="sm" onClick={goBack} className="gap-1">
              <ChevronLeft className="h-4 w-4" />
              {t('form.back')}
            </Button>
          )}

          {/* Show classification result if available */}
          {classificationResult ? (
            <div className="space-y-6">
              <Alert className="border-emerald-500/30 bg-emerald-500/10">
                <Check className="h-4 w-4 text-emerald-600" />
                <AlertDescription className="text-emerald-700 dark:text-emerald-300">
                  {t('admin.studies.goldStandardClassified')}
                </AlertDescription>
              </Alert>

              <ClassificationResultComponent result={classificationResult} />

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setClassificationResult(null);
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

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Classify button */}
              <Button
                type="button"
                size="lg"
                className={cn(
                  "w-full font-semibold transition-all duration-300",
                  isFormComplete() && "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
                )}
                disabled={!isFormComplete() || loading}
                onClick={handleClassify}
              >
                {loading ? (
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
