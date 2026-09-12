import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { api } from "../api";
import { CATEGORIES, type Transaction } from "../types";
import { Select, SelectOption } from "./ui/Select";
import { formatDate } from "../lib/formatDate";
import { formatCurrency } from "../lib/formatCurrency";

export default function TransactionsTable({
  statementId,
  transactions,
  currency,
}: {
  statementId: string;
  transactions: Transaction[];
  currency: string;
}) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const recategorize = useMutation({
    mutationFn: ({ id, category }: { id: string; category: string }) =>
      api.recategorize(getToken, id, category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", statementId] });
      queryClient.invalidateQueries({ queryKey: ["insights", statementId] });
    },
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-y border-line text-left text-xs uppercase tracking-wide text-text-400">
            <th className="px-5 py-2.5 font-medium">Date</th>
            <th className="px-5 py-2.5 font-medium">Description</th>
            <th className="px-5 py-2.5 font-medium text-right">Amount</th>
            <th className="px-5 py-2.5 font-medium">Category</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id} className="border-b border-line last:border-b-0">
              <td className="whitespace-nowrap px-5 py-2.5 font-mono tabular text-text-400">
                {formatDate(tx.date)}
              </td>
              <td className="px-5 py-2.5 text-text-100">{tx.description}</td>
              <td
                className={
                  "whitespace-nowrap px-5 py-2.5 text-right font-mono tabular " +
                  (tx.direction === "credit" ? "text-moss-400" : "text-text-100")
                }
              >
                {tx.direction === "credit" ? "+" : "−"}
                {formatCurrency(tx.amount, currency)}
              </td>
              <td className="px-5 py-2.5">
                <div className="flex items-center gap-2">
                  <Select
                    value={tx.category ?? ""}
                    onValueChange={(category) => recategorize.mutate({ id: tx.id, category })}
                    placeholder="Uncategorized"
                  >
                    {CATEGORIES.map((cat) => (
                      <SelectOption key={cat} value={cat}>
                        {cat}
                      </SelectOption>
                    ))}
                  </Select>
                  {tx.isUserOverridden && (
                    <span className="text-xs text-text-600">edited</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
