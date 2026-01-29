import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowLeft,
  Download,
  Users,
  Clock,
  BarChart3,
  PieChart,
  TrendingUp,
  Loader2,
  FileText,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { ThemeSwitcher } from '../../components/ThemeSwitcher';
import { UserMenu } from '../../components/auth/UserMenu';
import { studyApi, downloadStudyResponsesCSV } from '../../services/studyApi';

const CLASSIFICATION_SYSTEMS = [
  { key: 'danis_weber', label: 'Danis-Weber' },
  { key: 'lauge_hansen', label: 'Lauge-Hansen' },
  { key: 'ao_ota', label: 'AO/OTA' },
  { key: 'bartonicek', label: 'Bartonicek' },
];

const CHART_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-orange-500',
  'bg-teal-500',
];

export function StudyAnalyticsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [activeSystem, setActiveSystem] = useState('danis_weber');

  const { data: study, isLoading: isLoadingStudy } = useQuery({
    queryKey: ['study', id],
    queryFn: () => studyApi.getStudy(id!),
    enabled: !!id,
  });

  const { data: analytics, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ['study-analytics', id],
    queryFn: () => studyApi.getStudyAnalytics(id!),
    enabled: !!id,
  });

  const handleExportCSV = async () => {
    if (id && study) {
      await downloadStudyResponsesCSV(id, `${study.title.replace(/\s+/g, '_')}_responses.csv`);
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getDistributionData = () => {
    if (!analytics) return {};
    switch (activeSystem) {
      case 'danis_weber':
        return analytics.danis_weber_distribution || {};
      case 'lauge_hansen':
        return analytics.lauge_hansen_distribution || {};
      case 'ao_ota':
        return analytics.ao_ota_distribution || {};
      case 'bartonicek':
        return analytics.bartonicek_distribution || {};
      default:
        return {};
    }
  };

  const distribution = getDistributionData();
  const totalResponses = Object.values(distribution).reduce<number>((sum, count) => sum + (count as number), 0);

  if (isLoadingStudy || isLoadingAnalytics) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!study || !analytics) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{t('admin.studies.notFound')}</p>
          <Button className="mt-4" onClick={() => navigate('/admin/studies')}>
            {t('admin.studies.backToList')}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Activity className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="hidden sm:inline font-semibold text-xl tracking-tight">Anklyze</span>
            <Badge variant="secondary" className="ml-2">
              Admin
            </Badge>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeSwitcher />
            <LanguageSwitcher />
            <UserMenu />
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/studies')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{study.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{t(`studies.status.${study.status}`)}</Badge>
              <span className="text-sm text-muted-foreground">
                {t('admin.studies.analytics')}
              </span>
            </div>
          </div>
          <Button onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            {t('admin.studies.exportCSV')}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('admin.analytics.totalResponses')}
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.response_count}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('admin.analytics.uniqueRespondents')}
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.unique_respondents}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('admin.analytics.avgResponseTime')}
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatDuration(analytics.avg_time_taken_ms)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('admin.analytics.responsesPerUser')}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.unique_respondents > 0
                  ? (analytics.response_count / analytics.unique_respondents).toFixed(1)
                  : '0'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Classification Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              {t('admin.analytics.classificationDistribution')}
            </CardTitle>
            <CardDescription>
              {t('admin.analytics.distributionDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeSystem} onValueChange={setActiveSystem}>
              <TabsList className="grid w-full grid-cols-4 mb-6">
                {CLASSIFICATION_SYSTEMS.map((system) => (
                  <TabsTrigger key={system.key} value={system.key}>
                    {system.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {CLASSIFICATION_SYSTEMS.map((system) => (
                <TabsContent key={system.key} value={system.key}>
                  <DistributionChart
                    distribution={getDistributionData()}
                    total={totalResponses}
                    systemLabel={system.label}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface DistributionChartProps {
  distribution: Record<string, number>;
  total: number;
  systemLabel: string;
}

function DistributionChart({ distribution, total, systemLabel }: DistributionChartProps) {
  const { t } = useTranslation();
  const entries = Object.entries(distribution).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>{t('admin.analytics.noData')}</p>
      </div>
    );
  }

  const maxCount = Math.max(...entries.map(([, count]) => count));

  return (
    <div className="space-y-4">
      {entries.map(([type, count], index) => {
        const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
        const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
        const colorClass = CHART_COLORS[index % CHART_COLORS.length];

        return (
          <div key={type} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{type || t('admin.analytics.unspecified')}</span>
              <span className="text-muted-foreground">
                {count} ({percentage}%)
              </span>
            </div>
            <div className="h-8 bg-muted rounded-lg overflow-hidden">
              <div
                className={`h-full ${colorClass} transition-all duration-500 ease-out rounded-lg flex items-center`}
                style={{ width: `${barWidth}%` }}
              >
                {barWidth > 15 && (
                  <span className="px-2 text-xs font-medium text-white truncate">
                    {type}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t">
        {entries.map(([type], index) => (
          <div key={type} className="flex items-center gap-2 text-sm">
            <div className={`w-3 h-3 rounded ${CHART_COLORS[index % CHART_COLORS.length]}`} />
            <span>{type || t('admin.analytics.unspecified')}</span>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t">
        <p className="text-sm text-muted-foreground">
          {t('admin.analytics.summary', {
            system: systemLabel,
            types: entries.length,
            total,
          })}
        </p>
      </div>
    </div>
  );
}
