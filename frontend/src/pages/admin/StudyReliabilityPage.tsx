import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { StatCard, StatGroup } from '../../components/analytics';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from './components/StatusBadge';
import { studyApi } from '@/services';
import { PerCaseAgreementSection } from './components/PerCaseAgreementSection';
import { StudyKappaAnalysis } from './components/StudyKappaAnalysis';
import { StudyGoldStandardSection } from './components/StudyGoldStandardSection';
import { SystemTabs } from './components/SystemTabs';
import { LOW_AGREEMENT_PCT, SYSTEMS, useSystemParam } from './components/systems';
import { buildReliabilityFiguresCsv, downloadText, fileSlug } from './components/reliabilityCsv';
import { useRecordTitle } from '@/components/layout/recordTitle';

const PANEL_ID = 'study-system-panel';
const BACK_LINK =
  'inline-flex items-center gap-2 rounded-sm text-sm text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring';

const isNotFound = (error: unknown) => {
  const e = error as { code?: string; status?: number } | null;
  return e?.status === 404 || e?.code === 'NOT_FOUND';
};

export function StudyReliabilityPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [system, setSystem] = useSystemParam();
  const [exporting, setExporting] = useState<'figures' | 'responses' | null>(null);

  // A missing study is final; only other failures are worth a retry.
  const retry = (count: number, error: unknown) => !isNotFound(error) && count < 1;

  const studyQuery = useQuery({
    queryKey: ['admin-study', id],
    queryFn: () => studyApi.getStudy(id!),
    enabled: !!id,
    retry,
  });
  const study = studyQuery.data;
  useRecordTitle(study?.title);

  const reliabilityQuery = useQuery({
    queryKey: ['study-reliability', id],
    queryFn: () => studyApi.getStudyReliabilityMetrics(id!),
    enabled: !!id,
    retry,
  });
  const reliability = reliabilityQuery.data;

  const goldQuery = useQuery({
    queryKey: ['study-gold-standard', id],
    queryFn: () => studyApi.getStudyGoldStandardMetrics(id!),
    enabled: !!id,
    retry,
  });

  const runExport = async (kind: 'figures' | 'responses', work: () => Promise<void> | void) => {
    setExporting(kind);
    try {
      await work();
      toast.success(t(`admin.studies.reliability.export.${kind}Done`));
    } catch {
      toast.error(t(`admin.studies.reliability.export.${kind}Failed`));
    } finally {
      setExporting(null);
    }
  };

  if (studyQuery.isLoading || reliabilityQuery.isLoading || goldQuery.isLoading) {
    return <ReliabilitySkeleton label={t('common.loading')} />;
  }

  if (isNotFound(studyQuery.error) || isNotFound(reliabilityQuery.error)) {
    return (
      <PageMessage title={t('admin.studies.notFound')} description={t('admin.studies.notFoundDescription')}>
        <Button variant="outline" asChild>
          <Link to="/admin/studies">
            <ArrowLeft />
            {t('admin.studies.backToList')}
          </Link>
        </Button>
      </PageMessage>
    );
  }

  if (!study || !reliability) {
    return (
      <PageMessage
        title={t('admin.studies.reliability.loadFailed')}
        description={t('admin.studies.reliability.loadFailedDescription')}
      >
        <Button
          variant="outline"
          onClick={() => {
            void studyQuery.refetch();
            void reliabilityQuery.refetch();
          }}
        >
          {t('admin.studies.reliability.retry')}
        </Button>
      </PageMessage>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const slug = fileSlug(study.title);
  const lowAgreementCases = reliability.per_case_metrics.filter((c) => c.is_low_agreement).length;
  // With no responses there is nothing to compute or export.
  const noResponses = reliability.total_responses === 0;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6">
      <div className="space-y-4">
        <Link to={`/admin/studies/${id}/edit`} className={BACK_LINK}>
          <ArrowLeft aria-hidden className="size-4" />
          {t('admin.studies.backToStudy')}
        </Link>

        <PageHeader
          title={t('admin.reliability.title')}
          description={
            <span className="flex flex-wrap items-center gap-3">
              <span className="min-w-0 break-words">{reliability.study_title}</span>
              <StatusBadge status={study.status} label={t(`studies.status.${study.status}`)} />
            </span>
          }
          actions={
            <>
              <Button
                disabled={exporting !== null || noResponses}
                onClick={() =>
                  runExport('figures', () =>
                    downloadText(buildReliabilityFiguresCsv(reliability, goldQuery.data), `${slug}_figures_${today}.csv`)
                  )
                }
              >
                {exporting === 'figures' ? <Loader2 className="animate-spin" /> : <Download />}
                {t('admin.studies.reliability.export.figures')}
              </Button>
              <Button
                variant="outline"
                disabled={exporting !== null || noResponses}
                onClick={() =>
                  runExport('responses', () => studyApi.downloadStudyResponsesCSV(id!, `${slug}_responses_${today}.csv`))
                }
              >
                {exporting === 'responses' ? <Loader2 className="animate-spin" /> : <Download />}
                {t('admin.studies.reliability.export.responses')}
              </Button>
            </>
          }
        />
      </div>

      {noResponses ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-6">
          <p className="text-sm text-foreground" role="status">{t('admin.studies.reliability.noResponses')}</p>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/admin/studies/${id}/edit`}>{t('admin.studies.reliability.openStudy')}</Link>
          </Button>
        </div>
      ) : (
        <>
          <StudyKappaAnalysis reliability={reliability} />

          {/* The counts follow the headline kappas and lead into the per-case tables below. */}
          <StatGroup>
            <StatCard title={t('admin.studies.reliability.totalCases')} value={reliability.total_cases} />
            <StatCard title={t('admin.reliability.totalResponses')} value={reliability.total_responses} />
            <StatCard
              title={t('admin.studies.reliability.completeRaters')}
              value={t('admin.studies.reliability.nOfM', { n: reliability.complete_raters, m: reliability.unique_raters })}
              subtitle={t('admin.studies.reliability.completeRatersNote')}
            />
            <StatCard
              title={t('admin.studies.reliability.lowAgreementCasesTitle')}
              value={lowAgreementCases}
              subtitle={t('admin.studies.reliability.lowAgreementNote', { threshold: LOW_AGREEMENT_PCT })}
            />
          </StatGroup>

          <div className="space-y-6 border-t pt-6">
            <SystemTabs systems={SYSTEMS} active={system} onChange={setSystem} panelId={PANEL_ID} />

            <div id={PANEL_ID} role="tabpanel" aria-labelledby={`${PANEL_ID}-tab-${system}`} className="space-y-8">
              <PerCaseAgreementSection perCaseMetrics={reliability.per_case_metrics} activeSystem={system} />

              <StudyGoldStandardSection
                studyId={id!}
                metrics={goldQuery.data}
                isError={goldQuery.isError}
                onRetry={() => void goldQuery.refetch()}
                activeSystem={system}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PageMessage({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-16 text-center" role="alert">
      <h1 className="text-base font-semibold text-foreground">{title}</h1>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">{description}</p>
      {children}
    </div>
  );
}

/** ReliabilitySkeleton has the page's real shape so nothing shifts when data arrives. */
function ReliabilitySkeleton({ label }: { label: string }) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div className="space-y-4">
        <Skeleton className="h-5 w-32" />
        <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-5 w-48" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-44" />
            <Skeleton className="h-9 w-48" />
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-56" />
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-3 bg-card p-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-1.5 w-full" />
              <Skeleton className="h-3 w-40" />
            </div>
          ))}
        </div>
        <Skeleton className="h-4 w-full max-w-2xl" />
        <Skeleton className="h-20 w-full max-w-[70ch]" />
      </div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-2 bg-card p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
