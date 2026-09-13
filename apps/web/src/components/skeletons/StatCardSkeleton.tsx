import { Card } from "../ui/Card";
import { Skeleton } from "../ui/Skeleton";

/** Mirrors StatCard's icon-chip + label + value layout. */
export function StatCardSkeleton() {
  return (
    <Card className="flex items-center gap-4">
      <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-2 h-6 w-24" />
      </div>
    </Card>
  );
}
