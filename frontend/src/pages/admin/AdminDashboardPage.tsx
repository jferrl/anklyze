import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Users,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { StatCard } from '../../components/analytics';
import { studyApi } from '../../services/studyApi';
import { cn } from '@/lib/utils';

export function AdminDashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: studiesData, isLoading } = useQuery({
    queryKey: ['admin-studies-all'],
    queryFn: () => studyApi.listStudies(undefined, 1, 100),
  });

  const studies = studiesData?.studies ?? [];

  const stats = {
    totalStudies: studies.length,
    draftStudies: studies.filter((s) => s.status === 'draft').length,
    publishedStudies: studies.filter((s) => s.status === 'published').length,
    closedStudies: studies.filter((s) => s.status === 'closed').length,
    totalResponses: studies.reduce((sum, s) => sum + s.response_count, 0),
    totalUniqueUsers: studies.reduce((sum, s) => sum + s.unique_users, 0),
    avgResponsesPerStudy:
      studies.length > 0
        ? Math.round(
            studies.reduce((sum, s) => sum + s.response_count, 0) / studies.length
          )
        : 0,
  };

  const recentActiveStudies = [...studies]
    .filter((s) => s.response_count > 0)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  const studiesNeedingAttention = studies.filter((s) => {
    if (s.status === 'published' && s.response_count === 0) return true;
    if (s.deadline && new Date(s.deadline) < new Date() && s.status === 'published')
      return true;
    return false;
  });

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
              onClick={() => navigate('/admin/studies/new')}
              size="lg"
              className="gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-shadow"
            >
              <Sparkles className="w-4 h-4" />
              {t('admin.studies.create', 'Create Study')}
            </Button>
          </div>
        </header>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title={t('admin.dashboard.totalStudies')}
            value={stats.totalStudies}
            subtitle={`${stats.draftStudies} ${t('admin.dashboard.drafts')}, ${stats.publishedStudies} ${t('admin.dashboard.active')}`}
            icon={FileText}
            color="blue"
            delay={0}
          />
          <StatCard
            title={t('admin.dashboard.totalResponses')}
            value={stats.totalResponses}
            subtitle={t('admin.dashboard.avgPerStudy', { count: stats.avgResponsesPerStudy })}
            icon={BarChart3}
            color="emerald"
            delay={50}
          />
          <StatCard
            title={t('admin.dashboard.uniqueParticipants')}
            value={stats.totalUniqueUsers}
            subtitle={t('admin.dashboard.acrossAllStudies')}
            icon={Users}
            color="amber"
            delay={100}
          />
          <StatCard
            title={t('admin.dashboard.completedStudies')}
            value={stats.closedStudies}
            subtitle={`${stats.publishedStudies} ${t('admin.dashboard.stillActive')}`}
            icon={CheckCircle2}
            color="violet"
            delay={150}
          />
        </section>

        {/* Activity & Attention Grid */}
        <section className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Activity */}
          <div className="chart-card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-400/15 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {t('admin.dashboard.recentActivity')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('admin.dashboard.recentActivityDesc')}
                  </p>
                </div>
              </div>
            </div>

            {recentActiveStudies.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('admin.dashboard.noRecentActivity')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActiveStudies.map((study, index) => (
                  <button
                    key={study.id}
                    onClick={() => navigate(`/admin/studies/${study.id}/analytics`)}
                    className={cn(
                      'w-full flex items-center justify-between p-3 rounded-xl',
                      'bg-muted/30 hover:bg-muted/50 border border-transparent hover:border-border/50',
                      'transition-all duration-200 text-left group',
                      'opacity-0 animate-[fadeIn_0.3s_ease-out_forwards]'
                    )}
                    style={{ animationDelay: `${index * 50 + 200}ms` }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {study.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            study.status === 'published' && 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400',
                            study.status === 'closed' && 'border-muted-foreground/50'
                          )}
                        >
                          {t(`studies.status.${study.status}`)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {study.response_count} {t('admin.dashboard.responses')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className="text-xs text-muted-foreground">
                        {new Date(study.updated_at).toLocaleDateString()}
                      </span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Needs Attention */}
          <div className="chart-card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-400/15 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {t('admin.dashboard.needsAttention')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('admin.dashboard.needsAttentionDesc')}
                  </p>
                </div>
              </div>
            </div>

            {studiesNeedingAttention.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  {t('admin.dashboard.allGood')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  All studies are performing well
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {studiesNeedingAttention.slice(0, 5).map((study, index) => {
                  const isPastDeadline =
                    study.deadline && new Date(study.deadline) < new Date();
                  return (
                    <button
                      key={study.id}
                      onClick={() => navigate(`/admin/studies/${study.id}/edit`)}
                      className={cn(
                        'w-full flex items-center justify-between p-3 rounded-xl',
                        'bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/30',
                        'transition-all duration-200 text-left group',
                        'opacity-0 animate-[fadeIn_0.3s_ease-out_forwards]'
                      )}
                      style={{ animationDelay: `${index * 50 + 200}ms` }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {study.title}
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          {isPastDeadline
                            ? t('admin.dashboard.pastDeadline')
                            : t('admin.dashboard.noResponses')}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-amber-500/50 group-hover:text-amber-500 group-hover:translate-x-1 transition-all ml-2" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Status Breakdown */}
        <section className="chart-card">
          <div className="mb-6">
            <h3 className="font-semibold text-foreground">
              {t('admin.dashboard.statusBreakdown')}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t('admin.dashboard.statusBreakdownDesc')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                label: t('studies.status.draft'),
                value: stats.draftStudies,
                color: 'text-muted-foreground',
                bg: 'bg-muted/50',
                ring: 'ring-muted-foreground/20',
              },
              {
                label: t('studies.status.published'),
                value: stats.publishedStudies,
                color: 'text-emerald-600 dark:text-emerald-400',
                bg: 'bg-emerald-500/10',
                ring: 'ring-emerald-500/30',
              },
              {
                label: t('studies.status.closed'),
                value: stats.closedStudies,
                color: 'text-muted-foreground',
                bg: 'bg-muted/50',
                ring: 'ring-muted-foreground/20',
              },
            ].map((status, index) => (
              <div
                key={status.label}
                className={cn(
                  'relative text-center p-6 rounded-xl',
                  status.bg,
                  'ring-1',
                  status.ring,
                  'transition-all duration-300 hover:scale-[1.02]',
                  'opacity-0 animate-[fadeIn_0.4s_ease-out_forwards]'
                )}
                style={{ animationDelay: `${index * 100 + 300}ms` }}
              >
                <div className={cn('text-4xl font-bold', status.color)}>
                  {status.value}
                </div>
                <p className="text-sm text-muted-foreground mt-2 font-medium">
                  {status.label}
                </p>
                {stats.totalStudies > 0 && (
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {((status.value / stats.totalStudies) * 100).toFixed(0)}% of total
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          {stats.totalStudies > 0 && (
            <div className="mt-6 pt-6 border-t border-border/50">
              <div className="h-3 rounded-full bg-muted/50 overflow-hidden flex">
                {stats.draftStudies > 0 && (
                  <div
                    className="h-full bg-muted-foreground/30 transition-all duration-500"
                    style={{ width: `${(stats.draftStudies / stats.totalStudies) * 100}%` }}
                  />
                )}
                {stats.publishedStudies > 0 && (
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${(stats.publishedStudies / stats.totalStudies) * 100}%` }}
                  />
                )}
                {stats.closedStudies > 0 && (
                  <div
                    className="h-full bg-muted-foreground/50 transition-all duration-500"
                    style={{ width: `${(stats.closedStudies / stats.totalStudies) * 100}%` }}
                  />
                )}
              </div>
              <div className="flex items-center justify-center gap-6 mt-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-muted-foreground/30" />
                  <span className="text-xs text-muted-foreground">{t('studies.status.draft')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs text-muted-foreground">{t('studies.status.published')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-muted-foreground/50" />
                  <span className="text-xs text-muted-foreground">{t('studies.status.closed')}</span>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
