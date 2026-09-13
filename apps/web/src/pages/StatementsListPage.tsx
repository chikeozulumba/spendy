import { useMemo } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, FileStack, HandCoins, Wallet } from "lucide-react";
import { api } from "../api";
import LedgerTable from "../components/LedgerTable";
import SpendingByCategoryChart from "../components/SpendingByCategoryChart";
import SpendingByBankChart from "../components/SpendingByBankChart";
import CategoryAmountBarChart from "../components/CategoryAmountBarChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import { StatCard } from "../components/ui/StatCard";
import { StatCardSkeleton } from "../components/skeletons/StatCardSkeleton";
import { TableSkeleton } from "../components/skeletons/TableSkeleton";
import {
  AreaChartSkeleton,
  DonutChartSkeleton,
  HorizontalBarsSkeleton,
} from "../components/skeletons/ChartSkeletons";
import { EmptyLedgerState } from "../components/EmptyLedgerState";
import { formatCurrency } from "../lib/formatCurrency";

const LEDGER_COLUMNS = [
  { header: "Bank", width: "50%" },
  { header: "Period", width: "60%" },
  { header: "Currency", width: "30%" },
  { header: "Status", width: "40%" },
  { header: "Reconciled", width: "20%" },
  { header: "Filed", width: "50%" },
];

export default function StatementsListPage() {
  const { getToken } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["statements"],
    queryFn: () => api.listStatements(getToken),
    refetchInterval: 5000,
  });

  const overviewQuery = useQuery({
    queryKey: ["spending-overview"],
    queryFn: () => api.getSpendingOverview(getToken),
    enabled: !!data && data.length > 0,
  });

  const bankOverviewQuery = useQuery({
    queryKey: ["spending-by-bank"],
    queryFn: () => api.getSpendingByBank(getToken),
    enabled: !!data && data.length > 0,
  });

  const loansQuery = useQuery({
    queryKey: ["loans"],
    queryFn: () => api.getLoans(getToken),
    enabled: !!data && data.length > 0,
  });

  const stats = useMemo(() => {
    const currency = overviewQuery.data?.primaryCurrency ?? "USD";

    const totalSpent = (overviewQuery.data?.rows ?? [])
      .filter((r) => r.currency === currency)
      .reduce((sum, r) => sum + Number(r.total), 0);

    const reconciled = (data ?? []).filter(
      (s) => s.status === "done" && s.reconciliationOk !== null
    );
    const reconciliationRate =
      reconciled.length === 0
        ? null
        : Math.round(
            (reconciled.filter((s) => s.reconciliationOk).length / reconciled.length) * 100
          );

    const expectedRepayment = (loansQuery.data ?? [])
      .filter((loan) => loan.status === "outstanding" || loan.status === "overdue")
      .reduce((sum, loan) => sum + Number(loan.amount), 0);

    return {
      totalSpent: formatCurrency(totalSpent, currency),
      statementCount: data?.length ?? 0,
      reconciliationRate: reconciliationRate === null ? "—" : `${reconciliationRate}%`,
      expectedRepayment: formatCurrency(expectedRepayment, currency),
    };
  }, [data, overviewQuery.data, loansQuery.data]);

  // All-time per-category totals (summed across years) for the "Spending by
  // category" bar chart — derived from the same by-year/category rows the
  // area chart above already uses, just aggregated differently.
  const categoryTotals = useMemo(() => {
    const currency = overviewQuery.data?.primaryCurrency ?? "USD";
    const totals = new Map<string, number>();
    for (const row of overviewQuery.data?.rows ?? []) {
      if (row.currency !== currency) continue;
      totals.set(row.category, (totals.get(row.category) ?? 0) + Number(row.total));
    }
    return Array.from(totals, ([category, total]) => ({ category, total }));
  }, [overviewQuery.data]);

  if (isLoading) {
    return (
      <div>
        <div className="mb-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <Card className="p-0">
          <TableSkeleton columns={LEDGER_COLUMNS} />
        </Card>
      </div>
    );
  }

  if (error && !data) {
    return <p className="text-rust-400">{(error as Error).message}</p>;
  }

  // No statements at all yet — one focused empty state rather than a page
  // full of zeroed-out cards and charts that all say "nothing here" in
  // their own way.
  if (!data || data.length === 0) {
    return <EmptyLedgerState />;
  }

  return (
    <div>
      <div className="mb-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Wallet} label="Total spent" value={stats.totalSpent} tone="moss" />
        <StatCard
          icon={FileStack}
          label="Statements filed"
          value={String(stats.statementCount)}
          tone="neutral"
        />
        <StatCard
          icon={CheckCircle2}
          label="Reconciliation rate"
          value={stats.reconciliationRate}
          tone="moss"
        />
        <StatCard
          icon={HandCoins}
          label="Expected repayment"
          value={stats.expectedRepayment}
          tone="gold"
        />
      </div>

      <div className="mb-5">
        {overviewQuery.data ? (
          <SpendingByCategoryChart
            rows={overviewQuery.data.rows}
            primaryCurrency={overviewQuery.data.primaryCurrency}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Spending by category, by year</CardTitle>
              <CardDescription>
                Category totals across the years you've filed statements for
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AreaChartSkeleton />
            </CardContent>
          </Card>
        )}
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        {bankOverviewQuery.data ? (
          <SpendingByBankChart
            rows={bankOverviewQuery.data.rows}
            primaryCurrency={bankOverviewQuery.data.primaryCurrency}
          />
        ) : (
          <Card className="flex flex-col">
            <CardHeader className="items-center pb-4">
              <CardTitle>Spending by bank</CardTitle>
              <CardDescription>Total spend across all your statements</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <DonutChartSkeleton />
            </CardContent>
          </Card>
        )}
        {overviewQuery.data ? (
          categoryTotals.length > 0 && (
            <CategoryAmountBarChart
              title="Spending by category"
              description="Total spend per category across all statements"
              data={categoryTotals}
              currency={overviewQuery.data.primaryCurrency}
            />
          )
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Spending by category</CardTitle>
              <CardDescription>Total spend per category across all statements</CardDescription>
            </CardHeader>
            <CardContent>
              <HorizontalBarsSkeleton />
            </CardContent>
          </Card>
        )}
      </div>

      <div className="mb-5">
        <h1 className="text-xl font-bold tracking-tight text-text-100">Your ledger</h1>
      </div>

      <Card className="p-0">
        <LedgerTable statements={data} />
      </Card>
    </div>
  );
}
