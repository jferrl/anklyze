"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface FormSkeletonProps {
  className?: string
}

function FormSkeleton({ className }: FormSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Progress bar skeleton */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-8" />
        </div>
        <Skeleton className="h-2 w-full" />
      </div>

      {/* Question card skeleton */}
      <div className="relative flex flex-col gap-6 rounded-xl border py-6 bg-card/80 backdrop-blur-sm border-border/50">
        {/* Gradient accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20" />

        {/* Header skeleton */}
        <div className="px-6 space-y-2">
          <Skeleton className="h-6 w-3/4" />
        </div>

        {/* Options skeleton */}
        <div className="px-6 space-y-3">
          {[0.1, 0.2, 0.3, 0.4].map((delay) => (
            <div
              key={`skeleton-${delay}`}
              className="flex items-center gap-4 p-4 rounded-xl border-2 border-transparent bg-muted/30"
              style={{ animationDelay: `${delay}s` }}
            >
              <Skeleton className="h-6 w-6 rounded-full shrink-0" />
              <Skeleton className="h-5 flex-1" />
              <Skeleton className="h-5 w-5 hidden sm:block" />
            </div>
          ))}
        </div>
      </div>

      {/* Submit button skeleton */}
      <Skeleton className="h-11 w-full rounded-md" />

      {/* Keyboard hint skeleton */}
      <Skeleton className="h-4 w-48 mx-auto" />
    </div>
  )
}

export { FormSkeleton }
