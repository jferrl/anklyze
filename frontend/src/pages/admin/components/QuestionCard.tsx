import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { cn } from '@/lib/utils';
import type { QuestionErrorStats } from '@/types';

// Get badge variant for error rate
function getErrorRateBadgeClass(errorRate: number): string {
  if (errorRate <= 0.1) return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
  if (errorRate <= 0.25) return 'bg-green-500/10 text-green-600 border-green-500/30';
  if (errorRate <= 0.5) return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30';
  if (errorRate <= 0.75) return 'bg-orange-500/10 text-orange-600 border-orange-500/30';
  return 'bg-red-500/10 text-red-600 border-red-500/30';
}

export function QuestionCard({ stats }: { stats: QuestionErrorStats }) {
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
