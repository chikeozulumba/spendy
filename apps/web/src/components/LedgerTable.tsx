import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, CheckCircle2, ChevronsUpDown, HelpCircle, XCircle } from "lucide-react";
import type { StatementSummary } from "../types";
import StatusBadge from "./StatusBadge";
import { formatDate } from "../lib/formatDate";

const columnHelper = createColumnHelper<StatementSummary>();

const columns = [
  columnHelper.accessor((row) => row.bankName ?? "", {
    id: "bank",
    header: "Bank",
    cell: (info) => info.getValue() || <span className="text-text-600">—</span>,
  }),
  columnHelper.accessor((row) => row.statementPeriodStart ?? "", {
    id: "period",
    header: "Period",
    cell: (info) => {
      const row = info.row.original;
      if (!row.statementPeriodStart || !row.statementPeriodEnd) {
        return <span className="text-text-600">—</span>;
      }
      return (
        <span className="whitespace-nowrap font-mono tabular text-text-400">
          {formatDate(row.statementPeriodStart)} – {formatDate(row.statementPeriodEnd)}
        </span>
      );
    },
  }),
  columnHelper.accessor("currency", {
    header: "Currency",
    cell: (info) => <span className="font-mono text-text-400">{info.getValue()}</span>,
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  columnHelper.accessor((row) => (row.reconciliationOk === null ? -1 : row.reconciliationOk ? 1 : 0), {
    id: "reconciled",
    header: "Reconciled",
    cell: (info) => {
      const ok = info.row.original.reconciliationOk;
      if (ok === null) return <HelpCircle className="h-4 w-4 text-text-600" strokeWidth={2} />;
      return ok ? (
        <CheckCircle2 className="h-4 w-4 text-moss-400" strokeWidth={2} />
      ) : (
        <XCircle className="h-4 w-4 text-rust-400" strokeWidth={2} />
      );
    },
  }),
  columnHelper.accessor("createdAt", {
    header: "Filed",
    cell: (info) => (
      <span className="whitespace-nowrap font-mono tabular text-text-400">
        {formatDate(info.getValue())}
      </span>
    ),
  }),
];

export default function LedgerTable({
  statements,
  compact = false,
}: {
  statements: StatementSummary[];
  /** Narrower presentation for the homepage's half-width ledger card — drops
   * the least essential columns (currency, filed date) rather than cramming
   * all six into half the space. */
  compact?: boolean;
}) {
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);

  const table = useReactTable({
    data: statements,
    columns,
    state: {
      sorting,
      columnVisibility: compact ? { currency: false, createdAt: false } : {},
    },
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
                return (
                  <th key={header.id} className="px-5 py-2.5 font-medium">
                    <button
                      type="button"
                      onClick={header.column.getToggleSortingHandler()}
                      className="inline-flex items-center gap-1 hover:text-text-100"
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
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => navigate(`/statements/${row.original.id}`)}
              className="cursor-pointer border-b border-line last:border-b-0 hover:bg-ink-850"
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-5 py-3">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
