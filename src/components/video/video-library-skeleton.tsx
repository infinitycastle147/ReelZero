import { Skeleton } from "@/components/ui/skeleton";

export function VideoLibrarySkeleton() {
  return (
    <div className="space-y-6">
      {/* Toolbar skeleton */}
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-9 flex-1 min-w-[200px]" />
        <Skeleton className="h-9 w-[150px]" />
        <Skeleton className="h-9 w-[140px]" />
        <Skeleton className="h-9 w-[72px]" />
      </div>

      {/* Grid of 12 skeleton cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <Skeleton className="aspect-video w-full" />
            <div className="space-y-2 p-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
