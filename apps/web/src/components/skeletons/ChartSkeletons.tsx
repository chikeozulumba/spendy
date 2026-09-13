import { Skeleton } from "../ui/Skeleton";

// Deterministic pseudo-random heights (no Math.random — a skeleton that
// reflows differently every render is more distracting than one flat set of
// bars would be) for the two "fake chart" shapes below.
const HEIGHTS_A = [55, 80, 45, 70, 90, 60, 75, 50, 85, 65];
const HEIGHTS_B = [40, 65, 85, 55, 70, 45, 90, 60, 50, 75];

/** Stands in for SpendingByCategoryChart / PeriodComparisonChart while loading. */
export function AreaChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="flex items-end gap-2 border-b border-line pb-0" style={{ height }}>
      {HEIGHTS_A.map((h, i) => (
        <Skeleton key={i} className="flex-1" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

/** Stands in for the grouped bar comparison chart — pairs of bars per category. */
export function GroupedBarChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="flex items-end gap-4 border-b border-line pb-0" style={{ height }}>
      {HEIGHTS_A.slice(0, 5).map((h, i) => (
        <div key={i} className="flex h-full flex-1 items-end gap-1">
          <Skeleton className="flex-1" style={{ height: `${h}%` }} />
          <Skeleton className="flex-1" style={{ height: `${HEIGHTS_B[i]}%` }} />
        </div>
      ))}
    </div>
  );
}

/** Stands in for SpendingByBankChart's donut. */
export function DonutChartSkeleton() {
  return (
    <div className="flex justify-center py-2">
      <Skeleton className="size-[200px] rounded-full" />
    </div>
  );
}

/** Stands in for CategoryAmountBarChart's horizontal, inline-labeled bars. */
export function HorizontalBarsSkeleton({ rows = 5 }: { rows?: number }) {
  // Widths taper off, matching sorted-by-amount-descending real bars.
  const widths = [90, 75, 60, 45, 32, 22].slice(0, rows);
  return (
    <div className="flex flex-col gap-2.5" style={{ height: Math.max(200, rows * 40) }}>
      {widths.map((w, i) => (
        <Skeleton key={i} className="h-9 rounded-md" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}
