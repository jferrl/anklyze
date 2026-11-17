"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface FormSkeletonProps {
  className?: string
}

function FormSkeleton({ className }: FormSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <Skeleton className="h-1.5 w-full" />

      <div className="space-y-3">
        <Skeleton className="h-7 w-3/4" />
        <div className="divide-y overflow-hidden rounded-lg border bg-card">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="size-4 shrink-0 rounded-full" />
              <Skeleton className="h-5 flex-1" />
              <Skeleton className="hidden size-5 sm:block" />
            </div>
          ))}
        </div>
      </div>

      <Skeleton className="h-9 w-40" />
    </div>
  )
}

export { FormSkeleton }
