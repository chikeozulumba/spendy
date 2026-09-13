import { Skeleton } from "../ui/Skeleton";

/** Mirrors a scope row in BudgetsPage's Scopes card. */
export function ScopeRowSkeleton() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line px-4 py-3">
      <div>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-1.5 h-3 w-40" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-3 w-8" />
        <Skeleton className="h-3 w-10" />
      </div>
    </div>
  );
}

/** Mirrors BudgetRow: title/amount line, status badge, progress track, input row. */
export function BudgetRowSkeleton() {
  return (
    <div className="flex flex-col gap-2 border-b border-line py-4 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-1.5 h-3 w-36" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-40 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
    </div>
  );
}
