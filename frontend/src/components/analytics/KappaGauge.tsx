import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { formatKappa } from '@/lib/format';
import { getKappaInterpretation, kappaInterpretationKey } from '@/types';

interface KappaGaugeProps {
  value: number | undefined | null;
  label: string;
  description?: string;
  /** A muted caution printed under the description, e.g. for a small sample. */
  caution?: string;
  /** Identity colour of the system, drawn as a swatch before the label. */
  swatch?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Confidence interval of the kappa, drawn on the scale and printed beside it. */
  ci?: { lower: number; upper: number; level?: number };
  /** Left end of the scale. Gauges shown together must share it; alone, it follows the value. */
  min?: -1 | 0;
}

// A comma-decimal locale ("0,38") separates the bounds with a semicolon.
const interval = (lower: number, upper: number) =>
  `[${formatKappa(lower)}${formatKappa(0.5).includes(',') ? ';' : ','} ${formatKappa(upper)}]`;

// Landis & Koch band boundaries.
const TICKS = [0, 0.2, 0.4, 0.6, 0.8];

/** KappaLegend is the one Landis & Koch interpretation line printed under any set of kappas. */
export function KappaLegend({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <p className={cn('text-xs tabular-nums text-muted-foreground', className)}>
      <span className="font-medium text-foreground">{t('admin.reliability.kappaInterpretation')}</span>{' '}
      {t('admin.reliability.kappaLegend')} (Landis & Koch, 1977)
    </p>
  );
}

/** KappaGauge shows a kappa as the number itself, its Landis & Koch band, and its place on a scale. */
export function KappaGauge({ value, label, description, caution, swatch, size = 'md', ci, min: sharedMin }: KappaGaugeProps) {
  const hasValue = value !== undefined && value !== null;
  const { t } = useTranslation();
  const interpretation = hasValue
    ? t(kappaInterpretationKey(getKappaInterpretation(value).label))
    : t('common.notAvailable');
  const min = sharedMin ?? ((hasValue && value < 0) || (ci && ci.lower < 0) ? -1 : 0);
  const pos = (v: number) => ((Math.max(min, Math.min(1, v)) - min) / (1 - min)) * 100;

  return (
    <div className="min-w-0">
      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
        {swatch && <span className="size-2 shrink-0" style={{ backgroundColor: swatch }} />}
        {label}
      </p>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className={cn('font-display tabular-nums', size === 'sm' ? 'text-2xl' : 'text-4xl')}>
          {hasValue ? formatKappa(value) : '—'}
        </span>
        <span className="text-sm text-muted-foreground">{interpretation}</span>
      </div>
      {ci && (
        <p className="mt-1 text-xs tabular-nums text-muted-foreground">
          {t('admin.reliability.ciShort', { level: ((ci.level ?? 0.95) * 100).toFixed(0) })} {interval(ci.lower, ci.upper)}
        </p>
      )}

      <div className="mt-3" aria-hidden="true">
        <div className="relative h-1.5 rounded-sm bg-muted">
          {TICKS.map((tick) => (
            <span
              key={tick}
              className={cn('absolute inset-y-0 w-px', tick === 0 ? 'bg-muted-foreground' : 'bg-border')}
              style={{ left: `${pos(tick)}%` }}
            />
          ))}
          {hasValue && ci && (
            <span
              className="absolute inset-y-0 bg-primary/60"
              style={{ left: `${pos(ci.lower)}%`, width: `${pos(ci.upper) - pos(ci.lower)}%` }}
            />
          )}
          {hasValue && (
            <span
              className="absolute -inset-y-1 w-0.5 -translate-x-1/2 bg-primary ring-1 ring-card"
              style={{ left: `${pos(value)}%` }}
            />
          )}
        </div>
        <div className="relative mt-1 flex justify-between text-xs tabular-nums text-muted-foreground">
          <span>{min}</span>
          {min < 0 && (
            <span className="absolute -translate-x-1/2" style={{ left: `${pos(0)}%` }}>0</span>
          )}
          <span>1</span>
        </div>
      </div>

      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      {caution && <p className="mt-1 text-xs text-muted-foreground">{caution}</p>}
    </div>
  );
}
