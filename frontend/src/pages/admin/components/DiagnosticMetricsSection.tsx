import { useTranslation } from 'react-i18next';
import { TrendingUp, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../../components/ui/tooltip';
import { cn } from '@/lib/utils';

interface CategoryMetricsData {
  sensitivity: number;
  specificity: number;
  ppv: number;
  npv: number;
  f1_score: number;
}

interface DiagnosticMetricsSectionProps {
  perCategoryMetrics: Record<string, CategoryMetricsData>;
}

function getMetricColorClass(value: number): string {
  if (value >= 0.9) return 'text-emerald-600 dark:text-emerald-400';
  if (value >= 0.7) return 'text-green-600 dark:text-green-400';
  if (value >= 0.5) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

export function DiagnosticMetricsSection({ perCategoryMetrics }: DiagnosticMetricsSectionProps) {
  const { t } = useTranslation();

  return (
    <section className="chart-card mb-8">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">
          {t('admin.reliability.diagnosticMetrics')}
        </h2>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-4 h-4 text-muted-foreground/60" />
            </TooltipTrigger>
            <TooltipContent className="max-w-sm">
              <p>{t('admin.reliability.diagnosticMetricsDescription')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Mobile: Card layout */}
      <div className="md:hidden space-y-3">
        {Object.entries(perCategoryMetrics)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([category, categoryMetrics]) => (
            <div key={category} className="p-4 bg-muted/20 rounded-lg space-y-2">
              <div className="font-medium text-foreground">{category}</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('admin.reliability.sensitivity')}</span>
                  <span className={cn('font-semibold', getMetricColorClass(categoryMetrics.sensitivity))}>
                    {(categoryMetrics.sensitivity * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('admin.reliability.specificity')}</span>
                  <span className={cn('font-semibold', getMetricColorClass(categoryMetrics.specificity))}>
                    {(categoryMetrics.specificity * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('admin.reliability.f1Score')}</span>
                  <span className={cn('font-semibold', getMetricColorClass(categoryMetrics.f1_score))}>
                    {(categoryMetrics.f1_score * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('admin.reliability.ppv')}</span>
                  <span className={cn('font-semibold', getMetricColorClass(categoryMetrics.ppv))}>
                    {(categoryMetrics.ppv * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* Desktop: Table layout */}
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                {t('admin.reliability.category')}
              </th>
              <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="flex items-center justify-center gap-1">
                      {t('admin.reliability.sensitivity')}
                      <Info className="w-3 h-3" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('admin.reliability.sensitivityDescription')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </th>
              <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="flex items-center justify-center gap-1">
                      {t('admin.reliability.specificity')}
                      <Info className="w-3 h-3" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('admin.reliability.specificityDescription')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </th>
              <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="flex items-center justify-center gap-1">
                      {t('admin.reliability.ppv')}
                      <Info className="w-3 h-3" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('admin.reliability.ppvDescription')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </th>
              <th className="text-center py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="flex items-center justify-center gap-1">
                      {t('admin.reliability.npv')}
                      <Info className="w-3 h-3" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('admin.reliability.npvDescription')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </th>
              <th className="text-center py-3 px-4 font-medium text-muted-foreground">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="flex items-center justify-center gap-1">
                      {t('admin.reliability.f1Score')}
                      <Info className="w-3 h-3" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('admin.reliability.f1ScoreDescription')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(perCategoryMetrics)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([category, categoryMetrics]) => (
                <tr key={category} className="border-b border-border/30 hover:bg-muted/20">
                  <td className="py-3 px-4 font-medium text-foreground">{category}</td>
                  <td className={cn('py-3 px-4 text-center font-semibold', getMetricColorClass(categoryMetrics.sensitivity))}>
                    {(categoryMetrics.sensitivity * 100).toFixed(1)}%
                  </td>
                  <td className={cn('py-3 px-4 text-center font-semibold', getMetricColorClass(categoryMetrics.specificity))}>
                    {(categoryMetrics.specificity * 100).toFixed(1)}%
                  </td>
                  <td className={cn('py-3 px-4 text-center font-semibold', getMetricColorClass(categoryMetrics.ppv))}>
                    {(categoryMetrics.ppv * 100).toFixed(1)}%
                  </td>
                  <td className={cn('py-3 px-4 text-center font-semibold hidden lg:table-cell', getMetricColorClass(categoryMetrics.npv))}>
                    {(categoryMetrics.npv * 100).toFixed(1)}%
                  </td>
                  <td className={cn('py-3 px-4 text-center font-semibold', getMetricColorClass(categoryMetrics.f1_score))}>
                    {(categoryMetrics.f1_score * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-3 bg-muted/30 rounded-lg">
        <p className="text-xs text-muted-foreground">
          {t('admin.reliability.diagnosticMetricsNote')}
        </p>
      </div>
    </section>
  );
}
