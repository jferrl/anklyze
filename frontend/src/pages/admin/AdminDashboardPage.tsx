import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { StatCard, StatGroup } from '../../components/analytics';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { caseApi, studyApi } from '@/services';
import { formatNumber } from '@/lib/format';
import { RecentActivityCard } from './components/RecentActivityCard';
import { NeedsAttentionCard } from './components/NeedsAttentionCard';
import { StudiesInProgressCard } from './components/StudiesInProgressCard';
import { LoadError } from './components/LoadError';

export function AdminDashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [now] = useState(Date.now);

  const dashboard = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => caseApi.getDashboard(),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // shortcut: first 100 studies, newest first; paginate if a site ever runs more.
  const studiesQuery = useQuery({
    queryKey: ['admin-studies', 'dashboard'],
    queryFn: () => studyApi.listStudies(undefined, 1, 100),
  });

  // The dashboard API caps its attention list at 5 with no total, so the card filters the published cases itself.
  // shortcut: first 100 published cases (the API page limit); page through them if a site publishes more.
  const publishedQuery = useQuery({
    queryKey: ['admin-cases', 'published', 'dashboard'],
    queryFn: () => caseApi.listCases('published', 1, 100),
    refetchOnMount: 'always',
  });

  const queries = [dashboard, studiesQuery, publishedQuery];
  const header = (
    <PageHeader
      title={t('admin.dashboard.title')}
      description={t('admin.dashboard.subtitle')}
      actions={
        <>
          <Button variant="outline" onClick={() => navigate('/admin/studies/new')}>
            <Plus />
            {t('admin.studies.create')}
          </Button>
          <Button onClick={() => navigate('/admin/cases/new')}>
            <Plus />
            {t('admin.cases.create')}
          </Button>
        </>
      }
    />
  );

  if (queries.some((q) => q.isLoading)) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6" aria-busy="true">
        <span className="sr-only">{t('common.loading')}</span>
        {header}
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-2 bg-card p-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-14" />
              <Skeleton className="h-3 w-32 max-w-full" />
            </div>
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  const failed = queries.find((q) => q.isError);
  if (failed || !dashboard.data) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {header}
        <LoadError
          title={t('admin.dashboard.loadFailed')}
          error={failed?.error}
          onRetry={() => queries.forEach((q) => q.isError && q.refetch())}
        />
      </div>
    );
  }

  const s = dashboard.data.stats;
  const studies = studiesQuery.data?.studies ?? [];
  const n = (value: number) => formatNumber(value, 0);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      {header}

      <StatGroup>
        <StatCard
          title={t('admin.dashboard.totalCases')}
          value={n(s.total_cases)}
          subtitle={`${t('admin.dashboard.draftsCount', { count: s.draft_cases })}, ${t('admin.dashboard.activeCount', { count: s.published_cases })}, ${t('admin.dashboard.closedCount', { count: s.closed_cases })}`}
        />
        <StatCard
          title={t('admin.dashboard.totalResponses')}
          value={n(s.total_responses)}
          subtitle={
            s.total_cases > 0
              ? t('admin.dashboard.avgPerCase', { value: formatNumber(s.total_responses / s.total_cases, 1) })
              : undefined
          }
        />
        <StatCard
          title={t('admin.dashboard.uniqueParticipants')}
          value={n(s.total_unique_users)}
          subtitle={t('admin.dashboard.acrossAllCases')}
        />
        <StatCard
          title={t('admin.dashboard.activeStudies')}
          value={n(studies.filter((st) => st.status === 'active').length)}
          subtitle={t('admin.dashboard.draftsCount', { count: studies.filter((st) => st.status === 'draft').length })}
        />
      </StatGroup>

      <NeedsAttentionCard published={publishedQuery.data?.cases ?? []} now={now} />

      <StudiesInProgressCard studies={studies} now={now} />

      <RecentActivityCard cases={dashboard.data.recent_active_cases ?? []} />
    </div>
  );
}
