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

  const { data: casesData, isLoading } = useQuery({
    queryKey: ['admin-cases-all'],
    queryFn: () => caseApi.listCases(undefined, 1, 100),
    staleTime: 0, // Always consider data stale
    refetchOnMount: 'always', // Refetch when component mounts
  });

  const cases = useMemo(() => casesData?.cases ?? [], [casesData]);

  const stats = useMemo(() => ({
    totalCases: cases.length,
    draftCases: cases.filter((c) => c.status === 'draft').length,
    publishedCases: cases.filter((c) => c.status === 'published').length,
    closedCases: cases.filter((c) => c.status === 'closed').length,
    totalResponses: cases.reduce((sum, c) => sum + c.response_count, 0),
    totalUniqueUsers: cases.reduce((sum, c) => sum + c.unique_users, 0),
    avgResponsesPerCase:
      cases.length > 0
        ? Math.round(
            cases.reduce((sum, c) => sum + c.response_count, 0) / cases.length
          )
        : 0,
  }), [cases]);

  const recentActiveCases = useMemo(() =>
    [...cases]
      .filter((c) => c.response_count > 0)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5),
    [cases]
  );

  const casesNeedingAttention = useMemo(() =>
    cases.filter((c) => {
      if (c.status === 'published' && c.response_count === 0) return true;
      if (c.deadline && new Date(c.deadline) < new Date() && c.status === 'published')
        return true;
      return false;
    }),
    [cases]
  );

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
