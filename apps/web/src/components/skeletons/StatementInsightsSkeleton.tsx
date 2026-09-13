import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Skeleton } from "../ui/Skeleton";
import { AreaChartSkeleton, HorizontalBarsSkeleton } from "./ChartSkeletons";
import { TopMerchantsSkeleton } from "./TopMerchantsSkeleton";
import { TableSkeleton } from "./TableSkeleton";

const TRANSACTIONS_COLUMNS = [
  { header: "Date", width: "40%" },
  { header: "Description", width: "80%" },
  { header: "Amount", width: "35%" },
  { header: "Category", width: "50%" },
];

/**
 * Mirrors the "done" section of StatementDetailPage — summary, the
 * category/spend-over-time chart row, top merchants, and transactions —
 * shown while insights/transactions are still loading for an already-loaded
 * statement.
 */
export function StatementInsightsSkeleton() {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>

      <div className="grid gap-5 sm:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Spending by category</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarsSkeleton />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Spend over time</CardTitle>
          </CardHeader>
          <CardContent>
            <AreaChartSkeleton />
          </CardContent>
        </Card>
      </div>

      <Card className="p-0">
        <CardHeader className="mb-0 border-b-0 px-5 pt-5 pb-4">
          <CardTitle>Top merchants</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <TopMerchantsSkeleton />
        </CardContent>
      </Card>

      <Card className="p-0">
        <CardHeader className="mb-0 border-b-0 px-5 pt-5 pb-4">
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <TableSkeleton columns={TRANSACTIONS_COLUMNS} />
      </Card>
    </>
  );
}
