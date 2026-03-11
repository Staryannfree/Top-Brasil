import { Skeleton } from '@/components/ui/skeleton';

export function KanbanSkeleton() {
  return (
    <div className="space-y-6">
      {/* Metrics skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      {/* Toolbar skeleton */}
      <div className="flex gap-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32 ml-auto" />
      </div>
      {/* Kanban columns skeleton */}
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 5 }).map((_, col) => (
          <div key={col} className="w-72 flex-shrink-0 rounded-xl border bg-muted/30 p-3 space-y-3">
            <Skeleton className="h-5 w-32" />
            {Array.from({ length: 3 - col % 2 }).map((_, card) => (
              <Skeleton key={card} className="h-28 rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
