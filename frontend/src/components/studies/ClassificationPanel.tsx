import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Check, CheckCircle2, RotateCcw, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import type { ClassificationResult, FractureInput } from '@/types';
import { ClassificationResult as ClassificationResultComponent } from '../ClassificationResult';
import { CaseClassificationForm, type AnswerTracking } from './StudyClassificationForm';

interface ClassificationPanelProps {
  hasTACImages: boolean;
  classificationResult: ClassificationResult | null;
  submitting: boolean;
  submitError: string | null;
  submitSuccess: boolean;
  isExpired: boolean;
  cannotSubmit?: boolean;
  canReanswer?: boolean;
  onClassify: (input: FractureInput, tracking?: AnswerTracking) => Promise<ClassificationResult>;
  onSubmit: () => void;
  onReanswer: () => void;
  /** Where to go after submitting: the next pending case, or the cases list when none is left. */
  nextHref?: string;
  /** Whether nextHref points at a pending case rather than the list. */
  hasNextCase?: boolean;
}

function Notice({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg border bg-muted p-4">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 space-y-1">
        <h3 className="text-base font-semibold">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function Panel({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function ClassificationPanel({
  hasTACImages,
  classificationResult,
  submitting,
  submitError,
  submitSuccess,
  isExpired,
  cannotSubmit = false,
  canReanswer = true,
  onClassify,
  onSubmit,
  onReanswer,
  nextHref,
  hasNextCase = false,
}: ClassificationPanelProps) {
  const { t } = useTranslation();

  // Study expired state
  if (isExpired) {
    return (
      <Notice
        icon={<AlertCircle className="h-4 w-4 text-destructive" />}
        title={t('studies.studyExpired')}
      >
        <p className="text-sm text-muted-foreground">{t('studies.studyExpiredDescription')}</p>
      </Notice>
    );
  }

  // Already responded state (single response mode)
  if (cannotSubmit && !submitSuccess) {
    return (
      <Notice
        icon={<Check className="h-4 w-4 text-success" />}
        title={t('studies.alreadyResponded')}
      >
        <p className="text-sm text-muted-foreground">
          {t('studies.alreadyRespondedDescription')}
        </p>
      </Notice>
    );
  }

  // Success state
  if (submitSuccess) {
    return (
      <Notice
        icon={<Check className="h-4 w-4 text-success" />}
        title={t('studies.responseSubmitted')}
      >
        <p className="text-sm text-muted-foreground">{t('studies.responseSubmittedDescription')}</p>
        {(canReanswer || nextHref) && (
          <div className="flex flex-col gap-2 pt-3 sm:flex-row">
            {canReanswer && (
              <Button onClick={onReanswer} variant="outline" className="gap-2">
                <RotateCcw className="h-4 w-4" />
                {t('studies.submitAnother')}
              </Button>
            )}
            {nextHref && (
              <Button asChild variant="default" className="gap-2">
                <Link to={nextHref}>
                  {hasNextCase ? t('cases.nav.nextCase') : t('cases.backToList')}
                  {hasNextCase && <ArrowRight className="h-4 w-4" />}
                </Link>
              </Button>
            )}
          </div>
        )}
      </Notice>
    );
  }

  // Classification result review state
  if (classificationResult) {
    return (
      <div className="space-y-4">
        <Panel title={t('studies.classificationResult')} description={t('studies.reviewAndSubmit')}>
          <ClassificationResultComponent result={classificationResult} />
        </Panel>

        {submitError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={onReanswer} disabled={submitting} className="flex-1 gap-2">
            <RotateCcw className="h-4 w-4" />
            {t('studies.changeAnswer')}
          </Button>
          <Button onClick={onSubmit} disabled={submitting} className="flex-1 gap-2">
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {t('studies.submitResponse')}
          </Button>
        </div>
      </div>
    );
  }

  // Initial classification form state
  return (
    <Panel title={t('studies.classifyFracture')} description={t('studies.classifyFractureDescription')}>
      <CaseClassificationForm hasTACImages={hasTACImages} onClassify={onClassify} />
    </Panel>
  );
}
