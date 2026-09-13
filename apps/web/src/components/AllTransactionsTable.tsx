import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown, Send } from "lucide-react";
import { cn } from "../lib/cn";
import type { AllTransactionRow } from "../types";
import { formatCurrency } from "../lib/formatCurrency";
import { formatDate } from "../lib/formatDate";

const columnHelper = createColumnHelper<AllTransactionRow>();

const columns = [
  columnHelper.accessor("date", {
    header: "Date",
    cell: (info) => (
      <span className="whitespace-nowrap font-mono tabular text-text-400">
        {formatDate(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor("description", {
    header: "Description",
    cell: (info) => <span className="text-text-100">{info.getValue()}</span>,
  }),
  columnHelper.accessor((row) => row.category ?? "", {
    id: "category",
    header: "Category",
    cell: (info) =>
      info.row.original.category ?? <span className="text-text-600">Uncategorized</span>,
  }),
  columnHelper.accessor((row) => row.bankName ?? row.source, {
    id: "source",
    header: "Bank",
    cell: (info) => {
      const row = info.row.original;
      if (row.source === "telegram") {
        return (
          <span className="inline-flex items-center gap-1.5 text-sm text-text-400">
            <Send className="size-3.5" strokeWidth={1.8} />
            Telegram
          </span>
        );
      }
      return row.bankName ?? <span className="text-text-600">—</span>;
    },
  }),
  columnHelper.accessor((row) => (row.direction === "credit" ? 1 : -1) * Number(row.amount), {
    id: "amount",
    header: "Amount",
    cell: (info) => {
      const row = info.row.original;
      return (
        <span
          className={cn(
            "whitespace-nowrap font-mono tabular",
            row.direction === "credit" ? "text-moss-400" : "text-rust-400"
          )}
        >
          {row.direction === "credit" ? "+" : "−"}
          {formatCurrency(Number(row.amount), row.currency)}
        </span>
      );
    },
  }),
];

export function AllTransactionsTable({ transactions }: { transactions: AllTransactionRow[] }) {
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>([{ id: "date", desc: true }]);

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
                const sorted = header.column.getIsSorted();
                const isAmount = header.column.id === "amount";
                return (
                  <th
                    key={header.id}
                    className={cn("px-5 py-2.5 font-medium", isAmount && "text-right")}
                  >
                    <button
                      type="button"
                      onClick={header.column.getToggleSortingHandler()}
                      className={cn(
                        "inline-flex items-center gap-1 hover:text-text-100",
                        isAmount && "flex-row-reverse"
                      )}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {sorted === "asc" && <ArrowUp className="h-3 w-3" strokeWidth={2} />}
                      {sorted === "desc" && <ArrowDown className="h-3 w-3" strokeWidth={2} />}
                      {!sorted && <ChevronsUpDown className="h-3 w-3 opacity-40" strokeWidth={2} />}
                    </button>
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => {
            const statementId = row.original.statementId;
            return (
              <tr
                key={row.id}
                onClick={() => statementId && navigate(`/statements/${statementId}`)}
                className={cn(
                  "border-b border-line last:border-b-0",
                  statementId && "cursor-pointer hover:bg-ink-850"
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={cn(
                      "px-5 py-3",
                      cell.column.id === "amount" && "text-right"
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
