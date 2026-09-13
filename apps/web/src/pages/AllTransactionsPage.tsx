import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { AllTransactionsTable } from "../components/AllTransactionsTable";
import { Card } from "../components/ui/Card";
import { TableSkeleton } from "../components/skeletons/TableSkeleton";

const COLUMNS = [
  { header: "Date", width: "40%" },
  { header: "Description", width: "80%" },
  { header: "Category", width: "50%" },
  { header: "Bank", width: "40%" },
  { header: "Amount", width: "35%" },
];

export default function AllTransactionsPage() {
  const { getToken } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["all-transactions"],
    queryFn: () => api.getAllTransactions(getToken),
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-text-100">Transactions</h1>
        <p className="mt-1 text-sm text-text-400">
          Every transaction across your statements and Telegram captures, newest first.
        </p>
      </div>

      <Card className="p-0">
        {isLoading && <TableSkeleton columns={COLUMNS} rows={8} />}
        {error && !data && <p className="p-5 text-rust-400">{(error as Error).message}</p>}
        {data && data.rows.length === 0 && (
          <p className="p-5 text-text-400">
            No transactions yet. Upload a statement or send a document to your Telegram bot to get started.
          </p>
        )}
        {data && data.rows.length > 0 && <AllTransactionsTable transactions={data.rows} />}
      </Card>
    </div>
  );
}
