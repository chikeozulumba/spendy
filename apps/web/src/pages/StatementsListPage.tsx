import { useMemo } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CheckCircle2, FileStack, Landmark, Wallet } from "lucide-react";
import { api } from "../api";
import LedgerTable from "../components/LedgerTable";
import SpendingByCategoryChart from "../components/SpendingByCategoryChart";
import SpendingByBankChart from "../components/SpendingByBankChart";
import { Card, Eyebrow } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
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

      {(overviewQuery.data || bankOverviewQuery.data) && (
        <div className="mb-5 grid gap-5 lg:grid-cols-3">
          {overviewQuery.data && (
            <Card className="p-4 lg:col-span-2">
              <Eyebrow className="mb-1">Spending by category, by year</Eyebrow>
              <SpendingByCategoryChart
                rows={overviewQuery.data.rows}
                primaryCurrency={overviewQuery.data.primaryCurrency}
              />
            </Card>
          )}

          {bankOverviewQuery.data && (
            <Card className="p-4 lg:col-span-1">
              <Eyebrow className="mb-1">Spending by bank</Eyebrow>
              <SpendingByBankChart
                rows={bankOverviewQuery.data.rows}
                primaryCurrency={bankOverviewQuery.data.primaryCurrency}
              />
            </Card>
          )}
        </div>
      )}

      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-text-100">Your ledger</h1>
        <Link to="/upload">
          <Button>Upload statement</Button>
        </Link>
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
