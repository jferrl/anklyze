import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CaseMetrics } from '@/types';

// eslint-disable-next-line react-refresh/only-export-components
export function getAgreementColorClass(value: number): string {
  if (value >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (value >= 60) return 'text-green-600 dark:text-green-400';
  if (value >= 40) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

export type ClassificationSystem = 'danis_weber' | 'lauge_hansen' | 'ao_ota' | 'bartonicek';

interface CaseMetricCardProps {
  metrics: CaseMetrics;
  activeSystem: ClassificationSystem;
}

export function CaseMetricCard({ metrics, activeSystem }: CaseMetricCardProps) {
  const getAgreementValue = () => {
    switch (activeSystem) {
      case 'danis_weber':
        return metrics.danis_weber_agreement;
      case 'lauge_hansen':
        return metrics.lauge_hansen_agreement;
      case 'ao_ota':
        return metrics.ao_ota_agreement;
      case 'bartonicek':
        return metrics.bartonicek_agreement ?? 0;
    }
  };

  const agreement = getAgreementValue();

  return (
    <div
      className={cn(
        'p-4 rounded-lg',
        metrics.is_low_agreement ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-muted/20'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
            {metrics.case_order}
          </span>
          <span className="font-medium text-foreground truncate">{metrics.case_title}</span>
        </div>
        {metrics.is_low_agreement && (
          <AlertCircle className="w-4 h-4 text-amber-500" />
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{metrics.response_count} responses</span>
        <span className={cn('text-lg font-bold', getAgreementColorClass(agreement))}>
          {agreement.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
