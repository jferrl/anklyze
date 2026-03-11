import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Loader2, Target, Check, X } from 'lucide-react';
import type { FractureInput, ClassificationResult } from '@/types';
import { classifyFracture } from '@/services';
import { isFormComplete } from '@/features/fracture-classification/utils/formValidation';
import { ClassificationFormQuestions } from '@/features/fracture-classification/components/ClassificationFormQuestions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { ClassificationResult as ClassificationResultComponent } from '../ClassificationResult';
import { calculateProgress } from '@/features/fracture-classification/utils/formValidation';

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
  const { t } = useTranslation();

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

  const { formData, formHistory, classify: classifyState } = wizard;

  const setClassifyState = useCallback((state: ClassifyState) => {
    setWizard(prev => ({ ...prev, classify: state }));
  }, []);

  // Reset form when dialog opens
  const [prevOpen, setPrevOpen] = useState(false);
  if (open && !prevOpen) {
    setPrevOpen(true);
    setWizard(buildInitialWizardState());
  }
  if (!open && prevOpen) {
    setPrevOpen(false);
  }

  const canGoBack = formHistory.length > 0;

  const goBack = useCallback(() => {
    if (formHistory.length === 0) return;
    const previousState = formHistory[formHistory.length - 1];
    setWizard(prev => ({
      ...prev,
      formData: previousState,
      formHistory: prev.formHistory.slice(0, -1),
      classify: { status: 'idle', result: null },
    }));
  }, [formHistory]);

  // Called by ClassificationFormQuestions when user selects an answer
  const handleUpdate = useCallback((newData: Partial<FractureInput>) => {
    setWizard(prev => ({
      ...prev,
      formData: newData,
      formHistory: [...prev.formHistory, { ...prev.formData }],
      classify: { status: 'idle', result: null },
    }));
  }, []);

  const handleClassify = async () => {
    if (!isFormComplete(formData)) return;

    setClassifyState({ status: 'loading', result: null });

    try {
      const result = await classifyFracture(formData as FractureInput);
      setClassifyState({ status: 'done', result });
    } catch (err) {
      setClassifyState({ status: 'error', error: err instanceof Error ? err.message : 'Classification failed', result: null });
    }
  };

  const handleSave = () => {
    if (classifyState.status !== 'done' || !isFormComplete(formData)) return;
    onSave(formData as FractureInput, classifyState.result);
    onOpenChange(false);
  };

  const { currentStep, totalSteps } = calculateProgress(formData);
  const progress = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0;

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
          {formData.involved_malleoli && classifyState.status !== 'done' && (
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
                    setWizard({
                      formData: hasTACImages ? { has_ct_scan: true } : {},
                      formHistory: [],
                      classify: { status: 'idle', result: null },
                    });
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
              {/* Questions — single source of truth */}
              <ClassificationFormQuestions
                formData={formData}
                onUpdate={handleUpdate}
                hasTACImages={hasTACImages}
              />

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
                  isFormComplete(formData) && "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
                )}
                disabled={!isFormComplete(formData) || classifyState.status === 'loading'}
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
