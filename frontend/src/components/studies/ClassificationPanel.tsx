import { useTranslation } from 'react-i18next';
import { CheckCircle2, RotateCcw, Loader2, AlertCircle, Stethoscope, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import type { ClassificationResult, FractureInput } from '../../types/fracture';
import { ClassificationResult as ClassificationResultComponent } from '../ClassificationResult';
import { StudyClassificationForm } from './StudyClassificationForm';
import { cn } from '@/lib/utils';

interface ClassificationPanelProps {
  hasTACImages: boolean;
  classificationResult: ClassificationResult | null;
  submitting: boolean;
  submitError: string | null;
  submitSuccess: boolean;
  isExpired: boolean;
  onClassify: (input: FractureInput) => Promise<ClassificationResult>;
  onSubmit: () => void;
  onReanswer: () => void;
}

export function ClassificationPanel({
  hasTACImages,
  classificationResult,
  submitting,
  submitError,
  submitSuccess,
  isExpired,
  onClassify,
  onSubmit,
  onReanswer,
}: ClassificationPanelProps) {
  const { t } = useTranslation();

  // Study expired state
  if (isExpired) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="py-12">
          <div className="flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold text-destructive mb-2">
              {t('studies.studyExpired')}
            </h3>
            <p className="text-muted-foreground max-w-sm">
              {t('studies.studyExpiredDescription')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Success state
  if (submitSuccess) {
    return (
      <Card className="border-green-500/30 bg-green-500/5 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 via-green-500 to-green-400" />
        <CardContent className="py-12">
          <div className="flex flex-col items-center text-center">
            <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6 animate-in zoom-in duration-300">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold text-green-600 dark:text-green-400 mb-2">
              {t('studies.responseSubmitted')}
            </h3>
            <p className="text-muted-foreground mb-8 max-w-sm">
              {t('studies.responseSubmittedDescription')}
            </p>
            <Button
              onClick={onReanswer}
              variant="outline"
              size="lg"
              className="gap-2 border-green-500/30 hover:bg-green-500/10"
            >
              <RotateCcw className="h-4 w-4" />
              {t('studies.submitAnother')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Classification result review state
  if (classificationResult) {
    return (
      <div className="space-y-6">
        <Card className="overflow-hidden border-border/50 shadow-lg">
          <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 px-6 py-4 border-b">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{t('studies.classificationResult')}</h2>
                <p className="text-sm text-muted-foreground">{t('studies.reviewAndSubmit')}</p>
              </div>
            </div>
          </div>
          <CardContent className="p-6">
            <ClassificationResultComponent result={classificationResult} />
          </CardContent>
        </Card>

        {submitError && (
          <Alert variant="destructive" className="animate-in slide-in-from-top-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={onReanswer}
            disabled={submitting}
            className="flex-1 h-12"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {t('studies.changeAnswer')}
          </Button>
          <Button
            onClick={onSubmit}
            disabled={submitting}
            className={cn(
              "flex-1 h-12 font-semibold transition-all duration-300",
              !submitting && "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
            )}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            {t('studies.submitResponse')}
          </Button>
        </div>
      </div>
    );
  }

  // Initial classification form state
  return (
    <Card className="overflow-hidden border-border/50 shadow-lg">
      <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Stethoscope className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{t('studies.classifyFracture')}</h2>
            <p className="text-sm text-muted-foreground">{t('studies.classifyFractureDescription')}</p>
          </div>
        </div>
      </div>
      <CardContent className="p-6">
        <StudyClassificationForm
          hasTACImages={hasTACImages}
          onClassify={onClassify}
        />
      </CardContent>
    </Card>
  );
}
