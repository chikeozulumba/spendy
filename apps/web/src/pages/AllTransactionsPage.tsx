import { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { api } from "../api";
import { AllTransactionsTable } from "../components/AllTransactionsTable";
import { Card } from "../components/ui/Card";
import { StatCard } from "../components/ui/StatCard";
import { StatCardSkeleton } from "../components/skeletons/StatCardSkeleton";
import { TableSkeleton } from "../components/skeletons/TableSkeleton";
import { Pagination } from "../components/ui/Pagination";
import {
  SelectRoot as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/Select";
import { formatCurrency } from "../lib/formatCurrency";
import { CATEGORIES } from "../types";

const COLUMNS = [
  { header: "Date", width: "40%" },
  { header: "Description", width: "80%" },
  { header: "Category", width: "50%" },
  { header: "Bank", width: "40%" },
  { header: "Amount", width: "35%" },
];

const PAGE_SIZE = 50;

export default function AllTransactionsPage() {
  const { getToken } = useAuth();
  const [category, setCategory] = useState<string>("all");
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["all-transactions", "list", category, page],
    queryFn: () =>
      api.getAllTransactions(getToken, {
        category: category === "all" ? undefined : category,
        page,
        pageSize: PAGE_SIZE,
      }),
  });

  function chooseCategory(value: string) {
    setCategory(value);
    setPage(1); // a new filter invalidates whatever page we were on
  }

  const total = data?.pagination?.total ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-100">
            Transactions{!isLoading && ` (${total})`}
          </h1>
          <p className="mt-1 text-sm text-text-400">
            Every transaction across your statements and Spendybot captures, newest first.
          </p>
        </div>
        <Select value={category} onValueChange={chooseCategory}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              icon={ArrowDownCircle}
              label={category === "all" ? "Total spent" : `Spent on ${category}`}
              value={formatCurrency(Number(data?.metrics?.totalDebit ?? 0), data?.primaryCurrency ?? "USD")}
              tone="rust"
            />
            <StatCard
              icon={ArrowUpCircle}
              label={category === "all" ? "Total received" : `Received via ${category}`}
              value={formatCurrency(Number(data?.metrics?.totalCredit ?? 0), data?.primaryCurrency ?? "USD")}
              tone="moss"
            />
          </>
        )}
      </div>

      <Card className="p-0">
        {isLoading && <TableSkeleton columns={COLUMNS} rows={10} />}
        {error && !data && <p className="p-5 text-rust-400">{(error as Error).message}</p>}
        {data && data.rows.length === 0 && (
          <p className="p-5 text-text-400">
            {category === "all"
              ? "No transactions yet. Upload a statement or send a document to Spendybot to get started."
              : `No transactions in "${category}" yet.`}
          </p>
        )}
        {data && data.rows.length > 0 && (
          <>
            <AllTransactionsTable transactions={data.rows} />
            {data.pagination && (
              <Pagination
                page={data.pagination.page}
                totalPages={data.pagination.totalPages}
                onChange={setPage}
              />
            )}
          </>
        )}
      </Card>
    </div>
  );
}
