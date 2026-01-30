import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Users,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Spinner } from '../../components/ui/spinner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { studyApi } from '../../services/studyApi';

export function AdminDashboardPage() {
  const { t } = useTranslation();

  // Fetch all studies to calculate aggregate stats
  const { data: studiesData, isLoading } = useQuery({
    queryKey: ['admin-studies-all'],
    queryFn: () => studyApi.listStudies(undefined, 1, 100), // Get up to 100 studies
  });

  const studies = studiesData?.studies ?? [];

  // Calculate aggregate statistics
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

  // Get recent studies (last 5 with responses)
  const recentActiveStudies = [...studies]
    .filter((s) => s.response_count > 0)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  // Studies needing attention (published with no responses, or past deadline)
  const studiesNeedingAttention = studies.filter((s) => {
    if (s.status === 'published' && s.response_count === 0) return true;
    if (s.deadline && new Date(s.deadline) < new Date() && s.status === 'published')
      return true;
    return false;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">{t('admin.dashboard.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('admin.dashboard.subtitle')}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('admin.dashboard.totalStudies')}
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalStudies}</div>
              <p className="text-xs text-muted-foreground">
                {stats.draftStudies} {t('admin.dashboard.drafts')}, {stats.publishedStudies}{' '}
                {t('admin.dashboard.active')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('admin.dashboard.totalResponses')}
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalResponses}</div>
              <p className="text-xs text-muted-foreground">
                {t('admin.dashboard.avgPerStudy', { count: stats.avgResponsesPerStudy })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('admin.dashboard.uniqueParticipants')}
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUniqueUsers}</div>
              <p className="text-xs text-muted-foreground">
                {t('admin.dashboard.acrossAllStudies')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('admin.dashboard.completedStudies')}
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.closedStudies}</div>
              <p className="text-xs text-muted-foreground">
                {stats.publishedStudies} {t('admin.dashboard.stillActive')}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {t('admin.dashboard.recentActivity')}
              </CardTitle>
              <CardDescription>{t('admin.dashboard.recentActivityDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {recentActiveStudies.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('admin.dashboard.noRecentActivity')}
                </p>
              ) : (
                <div className="space-y-4">
                  {recentActiveStudies.map((study) => (
                    <div
                      key={study.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{study.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {t(`studies.status.${study.status}`)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {study.response_count} {t('admin.dashboard.responses')}
                          </span>
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {new Date(study.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Needs Attention */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                {t('admin.dashboard.needsAttention')}
              </CardTitle>
              <CardDescription>{t('admin.dashboard.needsAttentionDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {studiesNeedingAttention.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-green-500 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {t('admin.dashboard.allGood')}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {studiesNeedingAttention.slice(0, 5).map((study) => {
                    const isPastDeadline =
                      study.deadline && new Date(study.deadline) < new Date();
                    return (
                      <div
                        key={study.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{study.title}</p>
                          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                            {isPastDeadline
                              ? t('admin.dashboard.pastDeadline')
                              : t('admin.dashboard.noResponses')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Study Status Breakdown */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t('admin.dashboard.statusBreakdown')}</CardTitle>
            <CardDescription>{t('admin.dashboard.statusBreakdownDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-3xl font-bold text-muted-foreground">
                  {stats.draftStudies}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('studies.status.draft')}
                </p>
              </div>
              <div className="text-center p-4 rounded-lg bg-primary/10">
                <div className="text-3xl font-bold text-primary">{stats.publishedStudies}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('studies.status.published')}
                </p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-3xl font-bold text-muted-foreground">
                  {stats.closedStudies}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('studies.status.closed')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
