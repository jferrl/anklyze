import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Target } from 'lucide-react';
import { Progress } from '../../../components/ui/progress';
import { cn } from '@/lib/utils';

export function PathDistributionChart({ distribution, correctPath }: { distribution: Record<string, number>; correctPath: string }) {
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
