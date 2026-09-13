import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { api } from "../api";
import { BankCombobox } from "../components/BankCombobox";
import CategoryAmountBarChart from "../components/CategoryAmountBarChart";
import ReconciliationStamp from "../components/ReconciliationStamp";
import SpendOverTimeChart from "../components/SpendOverTimeChart";
import StatusBadge from "../components/StatusBadge";
import TopMerchants from "../components/TopMerchants";
import TransactionsTable from "../components/TransactionsTable";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { Progress } from "../components/ui/Progress";
import { StatementHeaderSkeleton } from "../components/skeletons/StatementHeaderSkeleton";
import { StatementInsightsSkeleton } from "../components/skeletons/StatementInsightsSkeleton";
import { TableSkeleton } from "../components/skeletons/TableSkeleton";
import { formatDate } from "../lib/formatDate";

const TRANSACTIONS_COLUMNS = [
  { header: "Date", width: "40%" },
  { header: "Description", width: "80%" },
  { header: "Amount", width: "35%" },
  { header: "Category", width: "50%" },
];

export default function StatementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
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
    mutationFn: () =>
      api.reprocessStatement(getToken, id!, password || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["statement", id] });
    },
  });

  const banksQuery = useQuery({
    queryKey: ["banks"],
    queryFn: () => api.getBankNames(getToken),
  });

  const assignBank = useMutation({
    mutationFn: (bankName: string) => api.assignBank(getToken, id!, bankName),
    onSuccess: () => {
      // Refresh everywhere this statement's bank shows up: its own detail
      // view, the ledger list/table, the home page's per-bank chart, and the
      // combobox's own option list (in case this created a brand new bank).
      queryClient.invalidateQueries({ queryKey: ["statement", id] });
      queryClient.invalidateQueries({ queryKey: ["statements"] });
      queryClient.invalidateQueries({ queryKey: ["spending-by-bank"] });
      queryClient.invalidateQueries({ queryKey: ["banks"] });
    },
  });

  const deleteStatement = useMutation({
    mutationFn: () => api.deleteStatement(getToken, id!),
    onSuccess: () => {
      // Every view that could have summed this statement's transactions in:
      // the ledger, both home-page charts, budget actuals for any period,
      // and any period comparison currently on screen.
      queryClient.invalidateQueries({ queryKey: ["statements"] });
      queryClient.invalidateQueries({ queryKey: ["spending-overview"] });
      queryClient.invalidateQueries({ queryKey: ["spending-by-bank"] });
      queryClient.invalidateQueries({ queryKey: ["budget-summary"] });
      queryClient.invalidateQueries({ queryKey: ["period-comparison"] });
      queryClient.invalidateQueries({ queryKey: ["banks"] });
      navigate("/");
    },
  });

  if (statementQuery.isLoading)
    return (
      <div className="flex flex-col gap-5">
        <StatementHeaderSkeleton />
        <StatementInsightsSkeleton />
      </div>
    );
  if (statementQuery.error)
    return (
      <p className="text-rust-400">{(statementQuery.error as Error).message}</p>
    );
  if (!statement) return null;

  const currency = statement.currency ?? "USD";

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate font-mono text-lg font-semibold text-text-100">
            {statement.originalFilename}
          </h1>
          <div className="mt-1.5 max-w-[220px]">
            <BankCombobox
              value={statement.bankName ?? ""}
              onValueChange={(bankName) => assignBank.mutate(bankName)}
              banks={banksQuery.data ?? []}
              placeholder="Assign a bank"
            />
          </div>
          {statement.statementPeriodStart && statement.statementPeriodEnd && (
            <p className="mt-1 text-sm text-text-400">
              {formatDate(statement.statementPeriodStart)} –{" "}
              {formatDate(statement.statementPeriodEnd)}
            </p>
          )}
          <div className="mt-3">
            <StatusBadge status={statement.status} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isDone &&
            insightsQuery.data &&
            insightsQuery.data.reconciliationOk !== null && (
              <ReconciliationStamp ok={insightsQuery.data.reconciliationOk} />
            )}
          <Button
            variant="danger"
            onClick={() => {
              if (
                confirm(
                  `Delete "${statement.originalFilename}"? This removes its transactions and can't be undone.`
                )
              ) {
                deleteStatement.mutate();
              }
            }}
            disabled={deleteStatement.isPending}
          >
            <Trash2 className="size-4" strokeWidth={1.8} />
            {deleteStatement.isPending ? "Deleting…" : "Delete statement"}
          </Button>
        </div>
      </Card>

      {(statement.status === "uploaded" ||
        statement.status === "processing") && (
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
            If this PDF is password-protected, enter the password to retry
            processing.
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="PDF password (if applicable)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-w-0 flex-1 rounded-md border border-line bg-ink-850 px-3 py-2 text-sm text-text-100 outline-none focus:border-moss-500"
            />
            <Button
              onClick={() => reprocess.mutate()}
              disabled={reprocess.isPending}
            >
              {reprocess.isPending ? "Retrying…" : "Retry"}
            </Button>
          </div>
        </Card>
      )}

      {isDone && !insightsQuery.data && <StatementInsightsSkeleton />}

      {isDone && insightsQuery.data && (
        <>
          {insightsQuery.data.reconciliationOk === false && (
            <Card className="border-rust-600 bg-rust-600/10">
              <p className="text-sm text-rust-400">
                {insightsQuery.data.reconciliationNote}
              </p>
            </Card>
          )}

          {insightsQuery.data.summary && (
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-text-100">
                  {insightsQuery.data.summary}
                </p>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-5 sm:grid-cols-1">
            <CategoryAmountBarChart
              title="Spending by category"
              description="Category totals for this statement"
              data={insightsQuery.data.categoryBreakdown
                .filter((r) => r.category !== null)
                .map((r) => ({
                  category: r.category as string,
                  total: Number(r.total),
                }))}
              currency={currency}
            />
            <SpendOverTimeChart
              rows={insightsQuery.data.spendOverTime}
              currency={currency}
            />
          </div>

          <Card className="p-0">
            <CardHeader className="mb-0 border-b-0 px-5 pt-5 pb-4">
              <CardTitle>Top merchants</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <TopMerchants
                rows={insightsQuery.data.topMerchants}
                currency={currency}
              />
            </CardContent>
          </Card>

          <Card className="p-0">
            <CardHeader className="mb-0 border-b-0 px-5 pt-5 pb-4">
              <CardTitle>Transactions</CardTitle>
            </CardHeader>
            {transactionsQuery.data ? (
              <TransactionsTable
                statementId={id!}
                transactions={transactionsQuery.data}
                currency={currency}
              />
            ) : (
              <TableSkeleton columns={TRANSACTIONS_COLUMNS} />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
