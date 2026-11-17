import { cn } from '@/lib/utils';

/** Logo is the Anklyze mark; it takes its colour from the surrounding text. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={cn('size-7 shrink-0', className)}>
      <rect width="32" height="32" rx="4" fill="currentColor" />
      <path
        d="M8 16h4l2-6 4 12 2-6h4"
        stroke="var(--logo-ink, var(--background))"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
