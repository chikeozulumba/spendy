import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowDownCircle, ArrowUpCircle, Calendar } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { Card } from "../components/ui/Card";
import { CategoryBadge } from "../components/ui/CategoryBadge";
import { ContactTypeBadge } from "../components/ui/ContactTypeBadge";
import { StatCard } from "../components/ui/StatCard";
import { StatCardSkeleton } from "../components/skeletons/StatCardSkeleton";
import { TableSkeleton } from "../components/skeletons/TableSkeleton";
import { formatCurrency } from "../lib/formatCurrency";
import { formatDate } from "../lib/formatDate";

const COLUMNS = [
  { header: "Date", width: "40%" },
  { header: "Description", width: "80%" },
  { header: "Category", width: "50%" },
  { header: "Amount", width: "35%" },
];

export default function ContactDetailPage() {
  const { getToken } = useAuth();
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["contacts", "detail", id],
    queryFn: () => api.getContact(getToken, id!),
    enabled: !!id,
  });

  return (
    <div className="flex flex-col gap-5">
      <Link
        to="/contacts"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-text-400 hover:text-text-100"
      >
        <ArrowLeft className="size-4" strokeWidth={1.8} />
        Back to people & places
      </Link>

      {error && !data && <p className="text-rust-400">{(error as Error).message}</p>}

      {isLoading && (
        <div className="flex flex-col gap-5">
          <div className="h-8 w-48 animate-pulse rounded-md bg-ink-850" />
          <div className="grid gap-5 sm:grid-cols-3">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
          <Card className="p-0">
            <TableSkeleton columns={COLUMNS} rows={8} />
          </Card>
        </div>
      )}

      {data && (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight text-text-100">
                {data.contact.name}
              </h1>
              <ContactTypeBadge type={data.contact.type} />
            </div>
            {data.metrics.lastInteractionAt && (
              <span className="inline-flex items-center gap-1.5 text-sm text-text-400">
                <Calendar className="size-3.5" strokeWidth={1.8} />
                Last interaction {formatDate(data.metrics.lastInteractionAt)}
              </span>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <StatCard
              icon={ArrowDownCircle}
              label="Sent to them"
              value={formatCurrency(Number(data.metrics.totalDebit), data.primaryCurrency)}
              tone="rust"
            />
            <StatCard
              icon={ArrowUpCircle}
              label="Received from them"
              value={formatCurrency(Number(data.metrics.totalCredit), data.primaryCurrency)}
              tone="moss"
            />
            <StatCard
              icon={Calendar}
              label="Interactions"
              value={String(data.metrics.transactionCount)}
              tone="gold"
            />
          </div>

          {data.topCategories.length > 0 && (
            <Card>
              <h2 className="text-sm font-semibold text-text-100">Top categories</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.topCategories.map((c) => (
                  <div key={c.category} className="flex items-center gap-2">
                    <CategoryBadge category={c.category} />
                    <span className="text-xs text-text-400">
                      {formatCurrency(Number(c.total), data.primaryCurrency)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-0">
            <div
              className="grid border-y border-line px-5 text-left text-xs font-medium uppercase tracking-wide text-text-400"
              style={{ gridTemplateColumns: "110px 1.6fr 170px 130px" }}
            >
              {COLUMNS.map((col) => (
                <div key={col.header} className="py-2.5">
                  {col.header}
                </div>
              ))}
            </div>
            {data.transactions.length === 0 && (
              <p className="p-5 text-text-400">No transactions with this contact yet.</p>
            )}
            {data.transactions.map((tx) => (
              <div
                key={tx.id}
                className="grid items-center border-b border-line px-5 py-3 text-sm last:border-b-0"
                style={{ gridTemplateColumns: "110px 1.6fr 170px 130px" }}
              >
                <span className="whitespace-nowrap font-mono tabular text-text-400">
                  {formatDate(tx.date)}
                </span>
                <span className="truncate text-text-100">{tx.description}</span>
                <span>
                  <CategoryBadge category={tx.category} />
                </span>
                <span
                  className={
                    tx.direction === "credit"
                      ? "whitespace-nowrap text-right font-mono tabular text-moss-400"
                      : "whitespace-nowrap text-right font-mono tabular text-rust-400"
                  }
                >
                  {tx.direction === "credit" ? "+" : "−"}
                  {formatCurrency(Number(tx.amount), tx.currency)}
                </span>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
