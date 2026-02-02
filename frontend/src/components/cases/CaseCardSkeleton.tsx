import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function CaseCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      {/* Status indicator bar skeleton */}
      <div className="h-1 bg-muted" />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-4 w-full mt-2" />
      </CardHeader>

      <CardContent className="pb-3">
        {/* Metadata badges */}
        <div className="flex gap-2 mb-4">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
        {/* Deadline */}
        <Skeleton className="h-4 w-32" />
      </CardContent>

      <CardFooter className="pt-0">
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  );
}

export function CaseCardSkeletonGrid() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <CaseCardSkeleton key={i} />
      ))}
    </div>
  );
}
