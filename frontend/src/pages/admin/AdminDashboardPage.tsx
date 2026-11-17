import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { StatCard, StatGroup } from '../../components/analytics';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { caseApi, studyApi } from '@/services';
import { RecentActivityCard } from './components/RecentActivityCard';
import { NeedsAttentionCard } from './components/NeedsAttentionCard';
import { StudiesInProgressCard } from './components/StudiesInProgressCard';

export function AdminDashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => caseApi.getDashboard(),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // shortcut: first 100 studies, newest first; paginate if a site ever runs more.
  const { data: studiesData, isLoading: isLoadingStudies } = useQuery({
    queryKey: ['admin-studies', 'dashboard'],
    queryFn: () => studyApi.listStudies(undefined, 1, 100),
  });
  const studies = studiesData?.studies ?? [];
  const activeStudies = studies.filter((s) => s.status === 'active').length;
  const draftStudies = studies.filter((s) => s.status === 'draft').length;

  const stats = useMemo(() => {
    if (!data) return { totalCases: 0, draftCases: 0, publishedCases: 0, closedCases: 0, totalResponses: 0, totalUniqueUsers: 0, avgResponsesPerCase: 0 };
    const s = data.stats;
    return {
      totalCases: s.total_cases,
      draftCases: s.draft_cases,
      publishedCases: s.published_cases,
      closedCases: s.closed_cases,
      totalResponses: s.total_responses,
      totalUniqueUsers: s.total_unique_users,
      avgResponsesPerCase: s.avg_responses_per_case,
    };
  }, [data]);

  const recentActiveCases = data?.recent_active_cases ?? [];
  const casesNeedingAttention = data?.cases_needing_attention ?? [];

  if (isLoading || isLoadingStudies) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6" aria-busy="true">
        <span className="sr-only">{t('common.loading', 'Loading dashboard...')}</span>
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6">
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
              {t('admin.cases.create', 'Create Case')}
            </Button>
          </>
        }
      />

      <StatGroup>
        <StatCard
          title={t('admin.dashboard.totalCases', 'Total Cases')}
          value={stats.totalCases}
          subtitle={`${t('admin.dashboard.draftsCount', { count: stats.draftCases })}, ${t('admin.dashboard.activeCount', { count: stats.publishedCases })}, ${t('admin.dashboard.closedCount', { count: stats.closedCases })}`}
        />
        <StatCard
          title={t('admin.dashboard.totalResponses')}
          value={stats.totalResponses}
          subtitle={t('admin.dashboard.avgPerCase', { count: stats.avgResponsesPerCase })}
        />
        <StatCard
          title={t('admin.dashboard.uniqueParticipants')}
          value={stats.totalUniqueUsers}
          subtitle={t('admin.dashboard.acrossAllCases', 'Across all cases')}
        />
        <StatCard
          title={t('admin.dashboard.activeStudies')}
          value={activeStudies}
          subtitle={t('admin.dashboard.draftsCount', { count: draftStudies })}
        />
      </StatGroup>

      <StudiesInProgressCard studies={studies} />

      <section className="grid gap-6 lg:grid-cols-2">
        <RecentActivityCard cases={recentActiveCases} />
        <NeedsAttentionCard cases={casesNeedingAttention} />
      </section>
    </div>
  );
}
