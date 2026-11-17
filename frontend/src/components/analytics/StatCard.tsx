import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    label: string;
  };
}

/** StatGroup is the single bordered container whose ruled cells are StatCards. */
export function StatGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        'grid grid-cols-1 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-4',
        className
      )}
    >
      {children}
    </section>
  );
}

/** StatCard is one cell of a StatGroup: label, exact value, one line of context. */
export function StatCard({ title, value, subtitle, trend }: StatCardProps) {
  return (
    <div className="bg-card p-4">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
        {trend && (
          <span className="text-xs tabular-nums text-muted-foreground">
            {trend.value >= 0 ? '+' : ''}
            {trend.value}% {trend.label}
          </span>
        )}
      </p>
      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
