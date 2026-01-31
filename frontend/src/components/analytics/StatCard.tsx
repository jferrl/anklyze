import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  color?: 'blue' | 'emerald' | 'amber' | 'rose' | 'violet';
  delay?: number;
}

const colorVariants = {
  blue: {
    iconBg: 'bg-blue-500/10 dark:bg-blue-400/15',
    iconColor: 'text-blue-600 dark:text-blue-400',
    accent: 'from-blue-500/20 to-transparent',
  },
  emerald: {
    iconBg: 'bg-emerald-500/10 dark:bg-emerald-400/15',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    accent: 'from-emerald-500/20 to-transparent',
  },
  amber: {
    iconBg: 'bg-amber-500/10 dark:bg-amber-400/15',
    iconColor: 'text-amber-600 dark:text-amber-400',
    accent: 'from-amber-500/20 to-transparent',
  },
  rose: {
    iconBg: 'bg-rose-500/10 dark:bg-rose-400/15',
    iconColor: 'text-rose-600 dark:text-rose-400',
    accent: 'from-rose-500/20 to-transparent',
  },
  violet: {
    iconBg: 'bg-violet-500/10 dark:bg-violet-400/15',
    iconColor: 'text-violet-600 dark:text-violet-400',
    accent: 'from-violet-500/20 to-transparent',
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'blue',
  delay = 0,
}: StatCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const colors = colorVariants[color];

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={cn(
        'stat-card group',
        'opacity-0 translate-y-4',
        isVisible && 'opacity-100 translate-y-0 transition-all duration-500 ease-out'
      )}
    >
      {/* Accent gradient */}
      <div
        className={cn(
          'absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-50',
          'bg-gradient-radial',
          colors.accent
        )}
      />

      <div className="relative flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                'text-3xl font-bold tracking-tight',
                'opacity-0',
                isVisible && 'animate-count-up'
              )}
              style={{ animationDelay: `${delay + 100}ms` }}
            >
              {value}
            </span>
            {trend && (
              <span
                className={cn(
                  'text-xs font-medium px-1.5 py-0.5 rounded-full',
                  trend.value >= 0
                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                    : 'text-rose-600 dark:text-rose-400 bg-rose-500/10'
                )}
              >
                {trend.value >= 0 ? '+' : ''}
                {trend.value}% {trend.label}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>

        <div
          className={cn(
            'flex items-center justify-center w-12 h-12 rounded-xl',
            'transition-transform duration-300 group-hover:scale-110',
            colors.iconBg
          )}
        >
          <Icon className={cn('w-6 h-6', colors.iconColor)} />
        </div>
      </div>
    </div>
  );
}
