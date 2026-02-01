import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface ConfusionMatrixProps {
  matrix: Record<string, Record<string, number>> | undefined;
  title?: string;
}

export function ConfusionMatrix({ matrix, title }: ConfusionMatrixProps) {
  const { labels, values, maxValue } = useMemo(() => {
    if (!matrix || Object.keys(matrix).length === 0) {
      return { labels: [], values: [], maxValue: 0 };
    }

    // Get all unique labels from both rows and columns
    const allLabels = new Set<string>();
    Object.keys(matrix).forEach((row) => {
      allLabels.add(row);
      Object.keys(matrix[row]).forEach((col) => allLabels.add(col));
    });
    const sortedLabels = Array.from(allLabels).sort();

    // Build 2D array
    const vals: number[][] = sortedLabels.map((row) =>
      sortedLabels.map((col) => matrix[row]?.[col] ?? 0)
    );

    // Find max value for color scaling
    let max = 0;
    vals.forEach((row) => {
      row.forEach((val) => {
        if (val > max) max = val;
      });
    });

    return { labels: sortedLabels, values: vals, maxValue: max };
  }, [matrix]);

  if (labels.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No data available
      </div>
    );
  }

  const getCellColor = (value: number) => {
    if (maxValue === 0) return 'bg-muted/30';
    const intensity = value / maxValue;
    if (intensity === 0) return 'bg-muted/30';
    if (intensity < 0.25) return 'bg-blue-100 dark:bg-blue-900/30';
    if (intensity < 0.5) return 'bg-blue-200 dark:bg-blue-800/40';
    if (intensity < 0.75) return 'bg-blue-300 dark:bg-blue-700/50';
    return 'bg-blue-400 dark:bg-blue-600/60';
  };

  const getCellTextColor = (value: number) => {
    if (maxValue === 0) return 'text-muted-foreground';
    const intensity = value / maxValue;
    if (intensity > 0.5) return 'text-foreground font-medium';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-4">
      {title && (
        <h4 className="text-sm font-medium text-foreground">{title}</h4>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-xs font-medium text-muted-foreground text-left">
                Actual / Predicted
              </th>
              {labels.map((label) => (
                <th
                  key={label}
                  className="p-2 text-xs font-medium text-muted-foreground text-center min-w-[60px]"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {values.map((row, i) => (
              <tr key={labels[i]}>
                <td className="p-2 text-xs font-medium text-muted-foreground">
                  {labels[i]}
                </td>
                {row.map((value, j) => (
                  <td
                    key={`${i}-${j}`}
                    className={cn(
                      'p-2 text-center text-sm border border-border/30 transition-colors',
                      getCellColor(value),
                      getCellTextColor(value),
                      i === j && 'ring-2 ring-primary/30 ring-inset'
                    )}
                  >
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <span>Low</span>
        <div className="flex gap-1">
          <div className="w-4 h-4 rounded bg-muted/30" />
          <div className="w-4 h-4 rounded bg-blue-100 dark:bg-blue-900/30" />
          <div className="w-4 h-4 rounded bg-blue-200 dark:bg-blue-800/40" />
          <div className="w-4 h-4 rounded bg-blue-300 dark:bg-blue-700/50" />
          <div className="w-4 h-4 rounded bg-blue-400 dark:bg-blue-600/60" />
        </div>
        <span>High</span>
      </div>
    </div>
  );
}
