import { useTranslation } from 'react-i18next';
import { CheckCircle2, RotateCcw, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import type { ClassificationResult, FractureInput } from '../../types/fracture';
import { ClassificationResult as ClassificationResultComponent } from '../ClassificationResult';
import { StudyClassificationForm } from './StudyClassificationForm';

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
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('studies.studyExpired')}</AlertTitle>
        <AlertDescription>
          {t('studies.studyExpiredDescription')}
        </AlertDescription>
      </Alert>
    );
  }

  // Success state
  if (submitSuccess) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {t('studies.responseSubmitted')}
          </h3>
          <p className="text-muted-foreground mb-6">
            {t('studies.responseSubmittedDescription')}
          </p>
          <Button onClick={onReanswer}>
            <RotateCcw className="h-4 w-4 mr-2" />
            {t('studies.submitAnother')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Classification result review state
  if (classificationResult) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('studies.classificationResult')}</CardTitle>
            <CardDescription>
              {t('studies.reviewAndSubmit')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ClassificationResultComponent result={classificationResult} />
          </CardContent>
        </Card>

        {submitError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={onReanswer}
            disabled={submitting}
            className="flex-1"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {t('studies.changeAnswer')}
          </Button>
          <Button
            onClick={onSubmit}
            disabled={submitting}
            className="flex-1"
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
    <Card>
      <CardHeader>
        <CardTitle>{t('studies.classifyFracture')}</CardTitle>
        <CardDescription>
          {t('studies.classifyFractureDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <StudyClassificationForm
          hasTACImages={hasTACImages}
          onClassify={onClassify}
        />
      </CardContent>
    </Card>
  );
}
