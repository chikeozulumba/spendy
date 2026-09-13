import { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import clsx from "clsx";
import { api } from "../api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import { PeriodPicker } from "../components/PeriodPicker";
import PeriodComparisonChart from "../components/PeriodComparisonChart";
import { StatCardSkeleton } from "../components/skeletons/StatCardSkeleton";
import { GroupedBarChartSkeleton } from "../components/skeletons/ChartSkeletons";
import { currentMonth, formatPeriodLabel, shiftMonths, type Period } from "../lib/period";
import { formatCurrency } from "../lib/formatCurrency";

export default function ComparePage() {
  const { getToken } = useAuth();
  const [periodB, setPeriodB] = useState<Period>(currentMonth());
  const [periodA, setPeriodA] = useState<Period>(shiftMonths(currentMonth(), -1));

  const comparisonQuery = useQuery({
    queryKey: ["period-comparison", periodA.start, periodA.end, periodB.start, periodB.end],
    queryFn: () =>
      api.getPeriodComparison(getToken, {
        aStart: periodA.start,
        aEnd: periodA.end,
        bStart: periodB.start,
        bEnd: periodB.end,
      }),
  });

  // Only meaningful when period B is exactly a range you've also set a
  // budget for — an arbitrary custom range has nothing to compare against.
  const budgetSummaryQuery = useQuery({
    queryKey: ["budget-summary", periodB.start, periodB.end],
    queryFn: () => api.getBudgetSummary(getToken, periodB.start, periodB.end),
  });
  const overBudgetScopes = (budgetSummaryQuery.data?.rows ?? []).filter((r) => r.overBudget);

  const data = comparisonQuery.data;
  const delta = data ? data.totalB - data.totalA : 0;
  const pctChange = data && data.totalA > 0 ? (delta / data.totalA) * 100 : null;
  const spendingMore = delta > 0;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-text-100">Compare periods</h1>
        <p className="mt-1 text-sm text-text-400">
          See how your spending in one period stacks up against another.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-text-400">
              Period A (baseline)
            </p>
            <PeriodPicker period={periodA} onChange={setPeriodA} />
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-text-400">
              Period B (comparison)
            </p>
            <PeriodPicker period={periodB} onChange={setPeriodB} />
          </div>
        </CardContent>
      </Card>

      {overBudgetScopes.length > 0 && (
        <Card className="border-rust-600 bg-rust-600/10">
          <CardContent className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rust-400" />
            <div>
              <p className="font-medium text-rust-400">
                You're over budget in {formatPeriodLabel(periodB)}
              </p>
              <p className="mt-1 text-sm text-rust-400/80">
                {overBudgetScopes.map((r) => r.scopeName).join(", ")}{" "}
                {overBudgetScopes.length === 1 ? "has" : "have"} exceeded its budget.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {comparisonQuery.isLoading ? (
        <div className="grid gap-5 sm:grid-cols-3">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : (
        data && (
          <div className="grid gap-5 sm:grid-cols-3">
            <Card>
              <p className="text-xs font-medium uppercase tracking-wide text-text-400">
                {formatPeriodLabel(periodA)}
              </p>
              <p className="mt-1 font-mono text-xl font-semibold text-text-100">
                {formatCurrency(data.totalA, data.currency)}
              </p>
            </Card>
            <Card>
              <p className="text-xs font-medium uppercase tracking-wide text-text-400">
                {formatPeriodLabel(periodB)}
              </p>
              <p className="mt-1 font-mono text-xl font-semibold text-text-100">
                {formatCurrency(data.totalB, data.currency)}
              </p>
            </Card>
            <Card className="flex items-center gap-3">
              <span
                className={clsx(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg",
                  spendingMore ? "bg-rust-400/10 text-rust-400" : "bg-moss-400/10 text-moss-400"
                )}
              >
                {spendingMore ? (
                  <TrendingUp className="size-5" />
                ) : (
                  <TrendingDown className="size-5" />
                )}
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-text-400">
                  Change
                </p>
                <p
                  className={clsx(
                    "font-mono text-xl font-semibold",
                    spendingMore ? "text-rust-400" : "text-moss-400"
                  )}
                >
                  {spendingMore ? "+" : ""}
                  {formatCurrency(delta, data.currency)}
                  {pctChange !== null && (
                    <span className="ml-1 text-sm font-normal text-text-400">
                      ({spendingMore ? "+" : ""}
                      {pctChange.toFixed(1)}%)
                    </span>
                  )}
                </p>
              </div>
            </Card>
          </div>
        )
      )}

      {comparisonQuery.isLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>Spending by category</CardTitle>
            <CardDescription>
              {formatPeriodLabel(periodA)} vs {formatPeriodLabel(periodB)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GroupedBarChartSkeleton />
          </CardContent>
        </Card>
      ) : (
        data && (
          <PeriodComparisonChart
            data={data.categories}
            currency={data.currency}
            labelA={formatPeriodLabel(periodA)}
            labelB={formatPeriodLabel(periodB)}
          />
        )
      )}
    </div>
  );
}
