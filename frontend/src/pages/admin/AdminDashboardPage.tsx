import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Users,
  FileText,
  CheckCircle2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { StatCard } from '../../components/analytics';
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
      <div className="min-h-screen bg-mesh flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <div className="absolute inset-0 w-16 h-16 rounded-2xl bg-primary/20 blur-xl mx-auto" />
          </div>
          <p className="text-muted-foreground mt-4 font-medium">
            {t('common.loading', 'Loading dashboard...')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {t('admin.dashboard.title')}
              </h1>
              <p className="text-muted-foreground mt-1">
                {t('admin.dashboard.subtitle')}
              </p>
            </div>
            <Button
              onClick={() => navigate('/admin/cases/new')}
              size="lg"
              className="gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-shadow"
            >
              <Sparkles className="w-4 h-4" />
              {t('admin.cases.create', 'Create Case')}
            </Button>
          </div>
        </header>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title={t('admin.dashboard.totalCases', 'Total Cases')}
            value={stats.totalCases}
            subtitle={`${stats.draftCases} ${t('admin.dashboard.drafts')}, ${stats.publishedCases} ${t('admin.dashboard.active')}`}
            icon={FileText}
            color="blue"
            delay={0}
          />
          <StatCard
            title={t('admin.dashboard.totalResponses')}
            value={stats.totalResponses}
            subtitle={t('admin.dashboard.avgPerCase', { count: stats.avgResponsesPerCase })}
            icon={BarChart3}
            color="emerald"
            delay={50}
          />
          <StatCard
            title={t('admin.dashboard.uniqueParticipants')}
            value={stats.totalUniqueUsers}
            subtitle={t('admin.dashboard.acrossAllCases', 'Across all cases')}
            icon={Users}
            color="amber"
            delay={100}
          />
          <StatCard
            title={t('admin.dashboard.completedCases', 'Completed Cases')}
            value={stats.closedCases}
            subtitle={`${stats.publishedCases} ${t('admin.dashboard.stillActive')}`}
            icon={CheckCircle2}
            color="violet"
            delay={150}
          />
        </section>

        {/* Activity & Attention Grid */}
        <section className="grid lg:grid-cols-2 gap-6 mb-8">
          <RecentActivityCard cases={recentActiveCases} />
          <NeedsAttentionCard cases={casesNeedingAttention} />
        </section>

        {/* Status Breakdown */}
        <StatusBreakdown stats={stats} />
      </div>
    </div>
  );
}
