import { cn } from "@/lib/cn";
import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "../api";
import { formatCurrency } from "../lib/formatCurrency";
import { formatDate } from "../lib/formatDate";
import { CATEGORIES, type Transaction } from "../types";
import { Select, SelectOption } from "./ui/Select";

const columnHelper = createColumnHelper<Transaction>();

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
  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: false },
  ]);

  const recategorize = useMutation({
    mutationFn: ({ id, category }: { id: string; category: string }) =>
      api.recategorize(getToken, id, category),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["transactions", statementId],
      });
      queryClient.invalidateQueries({ queryKey: ["insights", statementId] });
    },
  });

  const columns = useMemo(
    () => [
      columnHelper.accessor("date", {
        header: "Date",
        cell: (info) => formatDate(info.getValue()),
      }),
      columnHelper.accessor("description", {
        header: "Description",
      }),
      columnHelper.accessor(
        (row) => (row.direction === "credit" ? 1 : -1) * Number(row.amount),
        {
          id: "amount",
          header: "Amount",
          cell: (info) => {
            const row = info.row.original;
            return (
              <span
                className={cn(
                  "whitespace-nowrap",
                  row.direction === "credit" ? "text-moss-400" : "text-red-400",
                )}
              >
                {row.direction === "credit" ? "+" : "−"}
                {formatCurrency(row.amount, currency)}
              </span>
            );
          },
        },
      ),
      columnHelper.accessor((row) => row.category ?? "", {
        id: "category",
        header: "Category",
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex items-center gap-2">
              <Select
                value={row.category ?? ""}
                onValueChange={(category) =>
                  recategorize.mutate({ id: row.id, category })
                }
                placeholder="Uncategorized"
                className="whitespace-nowrap"
              >
                {CATEGORIES.map((cat) => (
                  <SelectOption key={cat} value={cat}>
                    {cat}
                  </SelectOption>
                ))}
              </Select>
              {row.isUserOverridden && (
                <span className="text-xs text-text-600">edited</span>
              )}
            </div>
          );
        },
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currency],
  );

  const table = useReactTable({
    data: transactions,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              key={headerGroup.id}
              className="border-y border-line text-left text-xs uppercase tracking-wide text-text-400"
            >
              {headerGroup.headers.map((header) => {
                const isAmount = header.column.id === "amount";
                const sorted = header.column.getIsSorted();
                return (
                  <th
                    key={header.id}
                    className={
                      "px-5 py-2.5 font-medium " +
                      (isAmount ? "text-right" : "")
                    }
                  >
                    <button
                      type="button"
                      onClick={header.column.getToggleSortingHandler()}
                      className={
                        "inline-flex items-center gap-1 hover:text-text-100 " +
                        (isAmount ? "flex-row-reverse" : "")
                      }
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      {sorted === "asc" && (
                        <ArrowUp className="h-3 w-3" strokeWidth={2} />
                      )}
                      {sorted === "desc" && (
                        <ArrowDown className="h-3 w-3" strokeWidth={2} />
                      )}
                      {!sorted && (
                        <ChevronsUpDown
                          className="h-3 w-3 opacity-40"
                          strokeWidth={2}
                        />
                      )}
                    </button>
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-b border-line last:border-b-0">
              {row.getVisibleCells().map((cell) => {
                const isAmount = cell.column.id === "amount";
                const isDate = cell.column.id === "date";
                const original = row.original;
                return (
                  <td
                    key={cell.id}
                    className={
                      "px-5 py-2.5 " +
                      (isAmount
                        ? "whitespace-nowrap text-right font-mono tabular " +
                          (original.direction === "credit"
                            ? "text-moss-400"
                            : "text-text-100")
                        : isDate
                          ? "whitespace-nowrap font-mono tabular text-text-400"
                          : "text-text-100")
                    }
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
