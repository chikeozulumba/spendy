import { Card } from "../ui/Card";
import { Skeleton } from "../ui/Skeleton";

/** Mirrors StatementDetailPage's header card: filename, bank picker, period, status badge. */
export function StatementHeaderSkeleton() {
  return (
    <Card className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="mt-2 h-8 w-[220px] rounded-lg" />
        <Skeleton className="mt-2 h-4 w-40" />
        <Skeleton className="mt-3 h-6 w-20 rounded-full" />
      </div>
    </Card>
  );
}
