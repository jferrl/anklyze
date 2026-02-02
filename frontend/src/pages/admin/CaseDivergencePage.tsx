import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Loader2,
  FileText,
  AlertTriangle,
  Target,
  ArrowLeftRight,
  Clock,
  BarChart3,
  Users,
  HelpCircle,
  CheckCircle2,
  GitBranch,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { StatCard } from '../../components/analytics';
import { caseApi } from '../../services/studyApi';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip';
import type { QuestionErrorStats } from '../../types/study';

// Get badge variant for error rate
function getErrorRateBadgeClass(errorRate: number): string {
  if (errorRate <= 0.1) return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
  if (errorRate <= 0.25) return 'bg-green-500/10 text-green-600 border-green-500/30';
  if (errorRate <= 0.5) return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30';
  if (errorRate <= 0.75) return 'bg-orange-500/10 text-orange-600 border-orange-500/30';
  return 'bg-red-500/10 text-red-600 border-red-500/30';
}

function QuestionCard({ stats }: { stats: QuestionErrorStats }) {
  const { t } = useTranslation();
  const [showAllWrongAnswers, setShowAllWrongAnswers] = useState(false);
  const displayName = t(`admin.divergence.questions.${stats.question}`, stats.question);
  const errorPercent = Math.round(stats.error_rate * 100);
  const correctPercent = 100 - errorPercent;

  // Get all wrong answers sorted
  const allWrongAnswers = useMemo(() => {
    if (!stats.wrong_answer_distribution) return [];
    return Object.entries(stats.wrong_answer_distribution)
      .sort(([, a], [, b]) => b - a);
  }, [stats.wrong_answer_distribution]);

  const displayedWrongAnswers = showAllWrongAnswers ? allWrongAnswers : allWrongAnswers.slice(0, 3);
  const hasMoreAnswers = allWrongAnswers.length > 3;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold truncate">
              {displayName}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t('admin.divergence.answersCount', { total: stats.total_answers, errors: stats.incorrect_answers })}
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn('shrink-0 font-mono', getErrorRateBadgeClass(stats.error_rate))}
          >
            {t('admin.divergence.errorPercent', { percent: errorPercent })}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Correct answer indicator */}
        {stats.correct_answer && (
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="text-sm text-emerald-700 dark:text-emerald-300">
              <span className="font-medium">{t('admin.divergence.correctAnswer')}:</span>{' '}
              <span className="font-mono">{stats.correct_answer}</span>
            </span>
          </div>
        )}

        {/* Error/Correct ratio bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-emerald-600 dark:text-emerald-400">
              {t('admin.divergence.correct', { percent: correctPercent })}
            </span>
            <span className="text-red-600 dark:text-red-400">
              {t('admin.divergence.error', { percent: errorPercent })}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden flex">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${correctPercent}%` }}
            />
            <div
              className="h-full bg-red-500 transition-all"
              style={{ width: `${errorPercent}%` }}
            />
          </div>
        </div>

        {/* Average time */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{t('admin.divergence.avgTime', { seconds: (stats.avg_time_ms / 1000).toFixed(1) })}</span>
        </div>

        {/* Wrong answer distribution */}
        {displayedWrongAnswers.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t('admin.divergence.commonWrongAnswers')}
            </p>
            <div className="space-y-1.5">
              {displayedWrongAnswers.map(([answer, count]) => (
                <div
                  key={answer}
                  className="flex items-center justify-between text-sm bg-muted/50 px-3 py-1.5 rounded-md"
                >
                  <span className="text-foreground truncate mr-2">{answer}</span>
                  <span className="text-muted-foreground font-mono text-xs shrink-0">
                    {count}x
                  </span>
                </div>
              ))}
            </div>
            {hasMoreAnswers && (
              <button
                onClick={() => setShowAllWrongAnswers(!showAllWrongAnswers)}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors mt-1"
              >
                {showAllWrongAnswers ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    {t('admin.divergence.showLess')}
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    {t('admin.divergence.showAll', { count: allWrongAnswers.length })}
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PathDistributionChart({ distribution, correctPath }: { distribution: Record<string, number>; correctPath: string }) {
  const { t } = useTranslation();
  const sortedPaths = useMemo(() => {
    if (!distribution) return [];
    return Object.entries(distribution)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
  }, [distribution]);

  const maxCount = sortedPaths.length > 0 ? sortedPaths[0][1] : 1;

  if (sortedPaths.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('admin.divergence.noPathData')}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedPaths.map(([path, count]) => {
        const isCorrect = path === correctPath;
        const percentage = Math.round((count / maxCount) * 100);

        return (
          <div key={path} className="space-y-1">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex-1 min-w-0 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium',
                  isCorrect
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                    : 'bg-muted text-foreground'
                )}
              >
                {isCorrect && <Target className="h-4 w-4 shrink-0" />}
                <span className="truncate font-mono text-xs">{path}</span>
              </div>
              <span className="text-sm font-mono text-muted-foreground w-12 text-right">
                {count}
              </span>
            </div>
            <Progress
              value={percentage}
              className={cn(
                'h-1.5',
                isCorrect ? '[&>div]:bg-emerald-500' : '[&>div]:bg-primary'
              )}
            />
          </div>
        );
      })}
    </div>
  );
}

export function CaseDivergencePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data: caseData, isLoading: isLoadingCase } = useQuery({
    queryKey: ['case', id],
    queryFn: () => caseApi.getCase(id!),
    enabled: !!id,
  });

  const { data: report, isLoading: isLoadingReport, error: reportError } = useQuery({
    queryKey: ['case-divergence', id],
    queryFn: () => caseApi.getDivergenceAnalysis(id!),
    enabled: !!id,
  });

  const isLoading = isLoadingCase || isLoadingReport;

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
            {t('common.loading')}
          </p>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center p-4">
        <div className="chart-card max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {t('admin.cases.notFound')}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t('admin.cases.notFoundDescription')}
          </p>
          <Button onClick={() => navigate('/admin/cases')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            {t('admin.cases.backToList')}
          </Button>
        </div>
      </div>
    );
  }

  // Error state for divergence report
  if (reportError || !report) {
    const errorMessage = reportError instanceof Error ? reportError.message : 'Failed to load divergence analysis';
    const needsGoldStandard = errorMessage.includes('gold standard');

    return (
      <div className="min-h-screen bg-mesh">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <header className="mb-8">
            <div className="space-y-3">
              <button
                onClick={() => navigate('/admin/cases')}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('admin.cases.backToList')}
              </button>

              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  {t('admin.divergence.title')}
                </h1>
                <p className="text-muted-foreground mt-1">{caseData.title}</p>
              </div>
            </div>
          </header>

          {/* Error Card */}
          <Card className="max-w-lg mx-auto">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-amber-500" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                {needsGoldStandard ? t('admin.divergence.goldStandardRequired') : t('admin.divergence.analysisUnavailable')}
              </h2>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                {needsGoldStandard
                  ? t('admin.divergence.goldStandardRequiredDesc')
                  : errorMessage}
              </p>
              {needsGoldStandard && (
                <Button
                  onClick={() => navigate(`/admin/cases/${id}/edit`)}
                  variant="outline"
                  className="gap-2"
                >
                  <Target className="w-4 h-4" />
                  {t('admin.divergence.configureGoldStandard')}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="space-y-3">
              <button
                onClick={() => navigate('/admin/cases')}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('admin.cases.backToList')}
              </button>

              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  {t('admin.divergence.title')}
                </h1>
                <p className="text-muted-foreground mt-1">{caseData.title}</p>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      'font-medium',
                      caseData.status === 'published' &&
                        'border-emerald-500/50 text-emerald-600 dark:text-emerald-400',
                      caseData.status === 'closed' &&
                        'border-amber-500/50 text-amber-600 dark:text-amber-400',
                      caseData.status === 'draft' && 'border-muted-foreground/50'
                    )}
                  >
                    {t(`cases.status.${caseData.status}`)}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-violet-500/50 text-violet-600 dark:text-violet-400"
                  >
                    <Target className="w-3 h-3 mr-1" />
                    {t('admin.divergence.goldStandardConfigured')}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => navigate(`/admin/cases/${id}/reliability`)}
                variant="outline"
                className="gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                {t('admin.divergence.viewReliability')}
              </Button>
            </div>
          </div>
        </header>

        {/* Summary Stats */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <StatCard
            title={t('admin.divergence.totalResponses')}
            value={report.total_responses}
            subtitle={t('admin.divergence.pathCoverageOf', { count: report.responses_with_path, total: report.total_responses })}
            icon={Users}
            color="blue"
            delay={0}
          />
          <StatCard
            title={t('admin.divergence.correctPathRate')}
            value={`${report.correct_path_percent.toFixed(1)}%`}
            subtitle={t('admin.divergence.correctPathCount', { count: report.correct_path_count, total: report.responses_with_path })}
            icon={CheckCircle2}
            color="emerald"
            delay={50}
          />
          <StatCard
            title={t('admin.divergence.uniquePaths')}
            value={report.unique_paths_count}
            subtitle={t('admin.divergence.uniquePathsDesc')}
            icon={GitBranch}
            color="violet"
            delay={100}
          />
          <StatCard
            title={t('admin.divergence.mostConfusing')}
            value={report.most_confusing_question
              ? t(`admin.divergence.questions.${report.most_confusing_question}`, report.most_confusing_question)
              : 'N/A'}
            subtitle={t('admin.divergence.errorRate', { percent: Math.round(report.most_confusing_error_rate * 100) })}
            icon={HelpCircle}
            color="amber"
            delay={150}
          />
          <StatCard
            title={t('admin.divergence.firstDivergence')}
            value={report.most_common_first_divergence
              ? t(`admin.divergence.questions.${report.most_common_first_divergence}`, report.most_common_first_divergence)
              : 'N/A'}
            subtitle={t('admin.divergence.firstDivergenceDesc')}
            icon={AlertCircle}
            color="rose"
            delay={200}
          />
          <StatCard
            title={t('admin.divergence.avgBackClicks')}
            value={report.avg_back_clicks.toFixed(1)}
            subtitle={
              report.back_click_correlation === 'positive' ? t('admin.divergence.correlationPositive') :
              report.back_click_correlation === 'negative' ? t('admin.divergence.correlationNegative') :
              t('admin.divergence.correlationNone')
            }
            icon={ArrowLeftRight}
            color="blue"
            delay={250}
          />
        </section>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Question Stats - takes 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-1">
                {t('admin.divergence.questionLevelAnalysis')}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t('admin.divergence.questionLevelAnalysisDesc')}
              </p>
            </div>

            {!report.question_stats || report.question_stats.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  {t('admin.divergence.noQuestionData')}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {report.question_stats.map((stats) => (
                  <QuestionCard key={stats.question} stats={stats} />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar - Path distribution and Back Click Analysis */}
          <div className="lg:col-span-1 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-1">
                {t('admin.divergence.decisionPaths')}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t('admin.divergence.pathAnalysisDesc', 'User decision paths compared to the gold standard')}
              </p>
            </div>
            <Card>
              <CardContent className="pt-6">
                {/* Correct path indicator */}
                <div className="mb-4 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      {t('admin.divergence.goldStandardPath')}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400 break-all">
                    {report.correct_path || t('admin.divergence.notConfigured')}
                  </p>
                </div>

                <PathDistributionChart
                  distribution={report.path_distribution || {}}
                  correctPath={report.correct_path || ''}
                />
              </CardContent>
            </Card>

            {/* Back click correlation explanation */}
            <TooltipProvider>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ArrowLeftRight className="h-5 w-5 text-primary" />
                    {t('admin.divergence.backClickAnalysis')}
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>{t('admin.divergence.backClickTooltip')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t('admin.divergence.averageBackClicks')}</span>
                      <span className="text-lg font-semibold">{report.avg_back_clicks.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t('admin.divergence.correlationLabel')}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          report.back_click_correlation === 'positive' &&
                            'border-emerald-500/50 text-emerald-600',
                          report.back_click_correlation === 'negative' &&
                            'border-red-500/50 text-red-600',
                          report.back_click_correlation === 'none' &&
                            'border-muted-foreground/50'
                        )}
                      >
                        {report.back_click_correlation === 'positive' && t('admin.divergence.correlationPositive')}
                        {report.back_click_correlation === 'negative' && t('admin.divergence.correlationNegative')}
                        {report.back_click_correlation === 'none' && t('admin.divergence.correlationNone')}
                      </Badge>
                    </div>

                    {/* High back click breakdown */}
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        {t('admin.divergence.highBackClickBreakdown')}
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            {t('admin.divergence.correctWithHighBack')}
                          </span>
                          <span className="font-mono">{report.correct_with_high_back_count}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            {t('admin.divergence.incorrectWithHighBack')}
                          </span>
                          <span className="font-mono">{report.incorrect_with_high_back_count}</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {report.back_click_correlation === 'positive' && t('admin.divergence.correlationPositiveDesc')}
                      {report.back_click_correlation === 'negative' && t('admin.divergence.correlationNegativeDesc')}
                      {report.back_click_correlation === 'none' && t('admin.divergence.correlationNoneDesc')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TooltipProvider>

            {/* First Divergence Distribution */}
            {report.first_divergence_stats && Object.keys(report.first_divergence_stats).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    {t('admin.divergence.firstDivergenceDistribution')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(report.first_divergence_stats)
                      .sort(([, a], [, b]) => b - a)
                      .map(([question, count]) => {
                        const maxCount = Math.max(...Object.values(report.first_divergence_stats));
                        const percentage = Math.round((count / maxCount) * 100);
                        return (
                          <div key={question} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="truncate">
                                {t(`admin.divergence.questions.${question}`, question)}
                              </span>
                              <span className="font-mono text-muted-foreground ml-2">{count}</span>
                            </div>
                            <Progress value={percentage} className="h-1.5 [&>div]:bg-amber-500" />
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
