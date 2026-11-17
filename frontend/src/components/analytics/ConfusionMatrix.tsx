import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface ConfusionMatrixProps {
  matrix: Record<string, Record<string, number>> | undefined;
  title?: string;
}

// Single-hue tint capped at 45% so the foreground ink stays readable in both themes.
const tint = (share: number) =>
  share === 0
    ? undefined
    : `color-mix(in oklch, var(--primary) ${Math.round(8 + share * 37)}%, transparent)`;

export function ConfusionMatrix({ matrix, title }: ConfusionMatrixProps) {
  const { t } = useTranslation();
  const { labels, values, maxValue } = useMemo(() => {
    if (!matrix || Object.keys(matrix).length === 0) {
      return { labels: [], values: [], maxValue: 0 };
    }

    const allLabels = new Set<string>();
    Object.keys(matrix).forEach((row) => {
      allLabels.add(row);
      Object.keys(matrix[row]).forEach((col) => allLabels.add(col));
    });
    const sortedLabels = Array.from(allLabels).sort();

    const vals: number[][] = sortedLabels.map((row) =>
      sortedLabels.map((col) => matrix[row]?.[col] ?? 0)
    );

    return { labels: sortedLabels, values: vals, maxValue: Math.max(0, ...vals.flat()) };
  }, [matrix]);

  if (labels.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        {t('common.noData')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {title && (
        <h4 className="text-sm font-medium text-foreground">{title}</h4>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm tabular-nums">
          <thead>
            <tr>
              <th scope="col" className="p-2 text-left text-xs font-medium text-muted-foreground">
                {t('admin.analytics.actualPredicted')}
              </th>
              {labels.map((label) => (
                <th
                  key={label}
                  scope="col"
                  className="min-w-[60px] p-2 text-right text-xs font-medium text-muted-foreground"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {values.map((row, i) => (
              <tr key={labels[i]}>
                <th scope="row" className="p-2 text-left text-xs font-medium text-muted-foreground">
                  {labels[i]}
                </th>
                {row.map((value, j) => (
                  <td
                    key={`${labels[i]}-${labels[j]}`}
                    className={cn(
                      'border p-2 text-right',
                      value === 0 ? 'text-muted-foreground' : 'text-foreground',
                      i === j && 'font-semibold outline outline-1 -outline-offset-1 outline-primary'
                    )}
                    style={{ backgroundColor: maxValue > 0 ? tint(value / maxValue) : undefined }}
                  >
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{t('admin.analytics.low')}</span>
        <div className="flex gap-0.5">
          {[0.1, 0.4, 0.7, 1].map((share) => (
            <span key={share} className="h-3 w-5 border" style={{ backgroundColor: tint(share) }} />
          ))}
        </div>
        <span>{t('admin.analytics.high')}</span>
      </div>
    </div>
  );
}
