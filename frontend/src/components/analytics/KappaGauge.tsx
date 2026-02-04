import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { getKappaInterpretation } from '@/types';

interface KappaGaugeProps {
  value: number | undefined | null;
  label: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeVariants = {
  sm: {
    gauge: 'w-20 h-20',
    text: 'text-lg',
    label: 'text-xs',
  },
  md: {
    gauge: 'w-28 h-28',
    text: 'text-2xl',
    label: 'text-sm',
  },
  lg: {
    gauge: 'w-36 h-36',
    text: 'text-3xl',
    label: 'text-base',
  },
};

const colorMap: Record<string, string> = {
  red: 'text-red-500 dark:text-red-400',
  orange: 'text-orange-500 dark:text-orange-400',
  yellow: 'text-yellow-500 dark:text-yellow-400',
  blue: 'text-blue-500 dark:text-blue-400',
  green: 'text-green-500 dark:text-green-400',
  emerald: 'text-emerald-500 dark:text-emerald-400',
};

const bgColorMap: Record<string, string> = {
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  yellow: 'bg-yellow-500',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  emerald: 'bg-emerald-500',
};

export function KappaGauge({ value, label, description, size = 'md' }: KappaGaugeProps) {
  const sizes = sizeVariants[size];

  const interpretation = useMemo(() => {
    if (value === undefined || value === null) {
      return { label: 'N/A', color: 'gray' };
    }
    return getKappaInterpretation(value);
  }, [value]);

  const percentage = useMemo(() => {
    if (value === undefined || value === null) return 0;
    // Map kappa from -1 to 1 to 0 to 100
    return Math.max(0, Math.min(100, ((value + 1) / 2) * 100));
  }, [value]);

  const circumference = 2 * Math.PI * 40; // radius = 40
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={cn('relative', sizes.gauge)}>
        {/* Background circle */}
        <svg className="w-full h-full -rotate-90">
          <circle
            cx="50%"
            cy="50%"
            r="40%"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted/20"
          />
          {/* Progress circle */}
          {value !== undefined && value !== null && (
            <circle
              cx="50%"
              cy="50%"
              r="40%"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              className={cn(
                'transition-all duration-1000 ease-out',
                colorMap[interpretation.color] || 'text-gray-400'
              )}
              style={{
                strokeDasharray: circumference,
                strokeDashoffset,
              }}
            />
          )}
        </svg>

        {/* Value display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-bold', sizes.text)}>
            {value !== undefined && value !== null ? value.toFixed(2) : '—'}
          </span>
        </div>
      </div>

      {/* Labels */}
      <div className="text-center space-y-0.5">
        <p className={cn('font-medium text-foreground', sizes.label)}>{label}</p>
        <div className="flex items-center justify-center gap-1.5">
          <span
            className={cn(
              'w-2 h-2 rounded-full',
              bgColorMap[interpretation.color] || 'bg-gray-400'
            )}
          />
          <span
            className={cn(
              'text-xs font-medium',
              colorMap[interpretation.color] || 'text-gray-400'
            )}
          >
            {interpretation.label}
          </span>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}
