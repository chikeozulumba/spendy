import { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api } from "../api";
import StatusBadge from "../components/StatusBadge";
import ReconciliationStamp from "../components/ReconciliationStamp";
import CategoryBreakdownChart from "../components/CategoryBreakdownChart";
import SpendOverTimeChart from "../components/SpendOverTimeChart";
import TopMerchants from "../components/TopMerchants";
import TransactionsTable from "../components/TransactionsTable";
import { Card, Eyebrow } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Progress } from "../components/ui/Progress";
import { formatDate } from "../lib/formatDate";

export default function StatementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");

  const statementQuery = useQuery({
    queryKey: ["statement", id],
    queryFn: () => api.getStatement(getToken, id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "uploaded" || status === "processing" ? 3000 : false;
    },
  });

  const statement = statementQuery.data;
  const isDone = statement?.status === "done";

  const transactionsQuery = useQuery({
    queryKey: ["transactions", id],
    queryFn: () => api.getTransactions(getToken, id!),
    enabled: !!id && isDone,
  });

  const insightsQuery = useQuery({
    queryKey: ["insights", id],
    queryFn: () => api.getInsights(getToken, id!),
    enabled: !!id && isDone,
  });

  const reprocess = useMutation({
    mutationFn: () => api.reprocessStatement(getToken, id!, password || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["statement", id] });
    },
  });

  if (statementQuery.isLoading) return <p className="text-text-400">Loading…</p>;
  if (statementQuery.error)
    return <p className="text-rust-400">{(statementQuery.error as Error).message}</p>;
  if (!statement) return null;

  const currency = statement.currency ?? "USD";

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate font-mono text-lg font-semibold text-text-100">
            {statement.originalFilename}
          </h1>
          {statement.statementPeriodStart && statement.statementPeriodEnd && (
            <p className="mt-1 text-sm text-text-400">
              {formatDate(statement.statementPeriodStart)} – {formatDate(statement.statementPeriodEnd)}
            </p>
          )}
          <div className="mt-3">
            <StatusBadge status={statement.status} />
          </div>
        </div>
        {isDone && insightsQuery.data && insightsQuery.data.reconciliationOk !== null && (
          <ReconciliationStamp ok={insightsQuery.data.reconciliationOk} />
        )}
      </Card>

      {(statement.status === "uploaded" || statement.status === "processing") && (
        <Card className="flex flex-col gap-3">
          <p className="text-text-400">
            {statement.status === "uploaded"
              ? "Queued — this statement is about to be picked up for processing."
              : "Extracting transactions and categorizing with AI. This usually takes under a minute."}
          </p>
          <Progress />
        </Card>
      )}

      {statement.status === "failed" && (
        <Card className="flex flex-col gap-3">
          <p className="rounded-lg border border-rust-600 bg-rust-600/10 px-4 py-3 text-sm text-rust-400">
            {statement.failureReason}
          </p>
          <p className="text-sm text-text-400">
            If this PDF is password-protected, enter the password to retry processing.
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="PDF password (if applicable)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-w-0 flex-1 rounded-md border border-line bg-ink-850 px-3 py-2 text-sm text-text-100 outline-none focus:border-moss-500"
            />
            <Button onClick={() => reprocess.mutate()} disabled={reprocess.isPending}>
              {reprocess.isPending ? "Retrying…" : "Retry"}
            </Button>
          </div>
        </Card>
      )}

      {isDone && insightsQuery.data && (
        <>
          {insightsQuery.data.reconciliationOk === false && (
            <Card className="border-rust-600 bg-rust-600/10">
              <p className="text-sm text-rust-400">{insightsQuery.data.reconciliationNote}</p>
            </Card>
          )}

          {insightsQuery.data.summary && (
            <Card>
              <Eyebrow>Summary</Eyebrow>
              <p className="text-sm leading-relaxed text-text-100">{insightsQuery.data.summary}</p>
            </Card>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <Card>
              <Eyebrow>Spending by category</Eyebrow>
              <CategoryBreakdownChart rows={insightsQuery.data.categoryBreakdown} currency={currency} />
            </Card>
            <Card>
              <Eyebrow>Spend over time</Eyebrow>
              <SpendOverTimeChart rows={insightsQuery.data.spendOverTime} currency={currency} />
            </Card>
          </div>

          <Card className="p-0">
            <Eyebrow className="px-5 pt-5">Top merchants</Eyebrow>
            <div className="px-5 pb-5">
              <TopMerchants rows={insightsQuery.data.topMerchants} currency={currency} />
            </div>
          </Card>

          <Card className="p-0">
            <Eyebrow className="px-5 pt-5">Transactions</Eyebrow>
            {transactionsQuery.data && (
              <TransactionsTable
                statementId={id!}
                transactions={transactionsQuery.data}
                currency={currency}
              />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
