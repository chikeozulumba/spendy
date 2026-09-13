import { useMemo } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, FileStack, Landmark, Wallet } from "lucide-react";
import { api } from "../api";
import LedgerTable from "../components/LedgerTable";
import SpendingByCategoryChart from "../components/SpendingByCategoryChart";
import SpendingByBankChart from "../components/SpendingByBankChart";
import CategoryAmountBarChart from "../components/CategoryAmountBarChart";
import { Card } from "../components/ui/Card";
import { StatCard } from "../components/ui/StatCard";
import { formatCurrency } from "../lib/formatCurrency";

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
  });

  const bankOverviewQuery = useQuery({
    queryKey: ["spending-by-bank"],
    queryFn: () => api.getSpendingByBank(getToken),
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

    const banks = new Set(
      (bankOverviewQuery.data?.rows ?? [])
        .map((r) => r.bankName)
        .filter((name) => name !== "Unknown")
    );

    return {
      totalSpent: formatCurrency(totalSpent, currency),
      statementCount: data?.length ?? 0,
      reconciliationRate: reconciliationRate === null ? "—" : `${reconciliationRate}%`,
      bankCount: banks.size,
    };
  }, [data, overviewQuery.data, bankOverviewQuery.data]);

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

  return (
    <div>
      {data && data.length > 0 && (
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
            icon={Landmark}
            label="Banks tracked"
            value={String(stats.bankCount)}
            tone="gold"
          />
        </div>
      )}

      {overviewQuery.data && (
        <div className="mb-5">
          <SpendingByCategoryChart
            rows={overviewQuery.data.rows}
            primaryCurrency={overviewQuery.data.primaryCurrency}
          />
        </div>
      )}

      {(bankOverviewQuery.data || categoryTotals.length > 0) && (
        <div className="mb-5 grid gap-5 lg:grid-cols-2">
          {bankOverviewQuery.data && (
            <SpendingByBankChart
              rows={bankOverviewQuery.data.rows}
              primaryCurrency={bankOverviewQuery.data.primaryCurrency}
            />
          )}
          {categoryTotals.length > 0 && (
            <CategoryAmountBarChart
              title="Spending by category"
              description="Total spend per category across all statements"
              data={categoryTotals}
              currency={overviewQuery.data?.primaryCurrency ?? "USD"}
            />
          )}
        </div>
      )}

      <div className="mb-5">
        <h1 className="text-xl font-bold tracking-tight text-text-100">Your ledger</h1>
      </div>

      <Card className="p-0">
        {isLoading && <p className="p-5 text-text-400">Loading…</p>}
        {error && !data && (
          <p className="p-5 text-rust-400">{(error as Error).message}</p>
        )}
        {data && data.length === 0 && (
          <p className="p-5 text-text-400">
            Nothing filed yet. Upload your first bank statement to start reconciling.
          </p>
        )}
        {data && data.length > 0 && <LedgerTable statements={data} />}
      </Card>
    </div>
  );
}
