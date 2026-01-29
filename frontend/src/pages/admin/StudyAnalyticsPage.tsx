import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, Pie, PieChart, Cell, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
  Download,
  Users,
  Clock,
  BarChart3,
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
import type { ChartConfig } from '../../components/ui/chart';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '../../components/ui/chart';
import { studyApi, downloadStudyResponsesCSV } from '../../services/studyApi';

const CLASSIFICATION_SYSTEMS = [
  { key: 'danis_weber', label: 'Danis-Weber' },
  { key: 'lauge_hansen', label: 'Lauge-Hansen' },
  { key: 'ao_ota', label: 'AO/OTA' },
  { key: 'bartonicek', label: 'Bartonicek' },
];

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(221, 83%, 53%)',
  'hsl(262, 83%, 58%)',
  'hsl(316, 73%, 52%)',
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

  const getDistributionData = useMemo(() => {
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
  }, [analytics, activeSystem]);

  const chartData = useMemo(() => {
    return Object.entries(getDistributionData)
      .map(([name, value], index) => ({
        name: name || t('admin.analytics.unspecified'),
        value: value as number,
        fill: CHART_COLORS[index % CHART_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [getDistributionData, t]);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    chartData.forEach((item, index) => {
      config[item.name] = {
        label: item.name,
        color: CHART_COLORS[index % CHART_COLORS.length],
      };
    });
    return config;
  }, [chartData]);

  const totalResponses = chartData.reduce((sum, item) => sum + item.value, 0);

  if (isLoadingStudy || isLoadingAnalytics) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!study || !analytics) {
    return (
      <div className="flex items-center justify-center py-12">
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
    <div className="h-full">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
            <CardTitle>{t('admin.analytics.classificationDistribution')}</CardTitle>
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
                  {chartData.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>{t('admin.analytics.noData')}</p>
                    </div>
                  ) : (
                    <div className="grid lg:grid-cols-2 gap-8">
                      {/* Pie Chart */}
                      <div>
                        <h4 className="text-sm font-medium mb-4 text-center">
                          {t('admin.analytics.distributionPie')}
                        </h4>
                        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[300px]">
                          <PieChart>
                            <ChartTooltip
                              cursor={false}
                              content={<ChartTooltipContent hideLabel />}
                            />
                            <Pie
                              data={chartData}
                              dataKey="value"
                              nameKey="name"
                              innerRadius={60}
                              strokeWidth={5}
                            >
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                            <ChartLegend
                              content={<ChartLegendContent nameKey="name" />}
                              className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
                            />
                          </PieChart>
                        </ChartContainer>
                      </div>

                      {/* Bar Chart */}
                      <div>
                        <h4 className="text-sm font-medium mb-4 text-center">
                          {t('admin.analytics.distributionBar')}
                        </h4>
                        <ChartContainer config={chartConfig} className="h-[300px]">
                          <BarChart
                            accessibilityLayer
                            data={chartData}
                            layout="vertical"
                            margin={{ left: 0 }}
                          >
                            <CartesianGrid horizontal={false} />
                            <YAxis
                              dataKey="name"
                              type="category"
                              tickLine={false}
                              tickMargin={10}
                              axisLine={false}
                              width={100}
                              tick={{ fontSize: 12 }}
                            />
                            <XAxis type="number" hide />
                            <ChartTooltip
                              cursor={false}
                              content={<ChartTooltipContent hideLabel />}
                            />
                            <Bar dataKey="value" radius={5}>
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ChartContainer>
                      </div>
                    </div>
                  )}

                  {/* Summary Stats */}
                  {chartData.length > 0 && (
                    <div className="mt-6 pt-4 border-t">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {chartData.slice(0, 4).map((item) => (
                          <div key={item.name} className="text-center">
                            <div
                              className="h-2 w-full rounded mb-2"
                              style={{ backgroundColor: item.fill }}
                            />
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            <p className="text-2xl font-bold">{item.value}</p>
                            <p className="text-xs text-muted-foreground">
                              {totalResponses > 0
                                ? `${((item.value / totalResponses) * 100).toFixed(1)}%`
                                : '0%'}
                            </p>
                          </div>
                        ))}
                      </div>
                      {chartData.length > 4 && (
                        <p className="text-sm text-muted-foreground text-center mt-4">
                          {t('admin.analytics.andMore', { count: chartData.length - 4 })}
                        </p>
                      )}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
