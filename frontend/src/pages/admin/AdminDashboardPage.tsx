import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { StatCard, StatGroup } from '../../components/analytics';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { caseApi } from '@/services';
import { RecentActivityCard } from './components/RecentActivityCard';
import { NeedsAttentionCard } from './components/NeedsAttentionCard';
import { StatusBreakdown } from './components/StatusBreakdown';

export function AdminDashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => caseApi.getDashboard(),
    staleTime: 0,
    refetchOnMount: 'always',
  });

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

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6" aria-busy="true">
        <span className="sr-only">{t('common.loading', 'Loading dashboard...')}</span>
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-24 w-full" />
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
          <Button onClick={() => navigate('/admin/cases/new')}>
            <Plus />
            {t('admin.cases.create', 'Create Case')}
          </Button>
        }
      />

      <StatGroup>
        <StatCard
          title={t('admin.dashboard.totalCases', 'Total Cases')}
          value={stats.totalCases}
          subtitle={`${t('admin.dashboard.draftsCount', { count: stats.draftCases })}, ${t('admin.dashboard.activeCount', { count: stats.publishedCases })}`}
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
          title={t('admin.dashboard.completedCases', 'Completed Cases')}
          value={stats.closedCases}
          subtitle={t('admin.dashboard.stillActiveCount', { count: stats.publishedCases })}
        />
      </StatGroup>

      <section className="grid gap-6 lg:grid-cols-2">
        <RecentActivityCard cases={recentActiveCases} />
        <NeedsAttentionCard cases={casesNeedingAttention} />
      </section>

      <StatusBreakdown stats={stats} />
    </div>
  );
}
