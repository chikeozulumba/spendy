import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown, ArrowUp, ChevronsUpDown, Send } from "lucide-react";
import { cn } from "../lib/cn";
import type { AllTransactionRow } from "../types";
import { formatCurrency } from "../lib/formatCurrency";
import { formatDate } from "../lib/formatDate";
import { CategoryBadge } from "./ui/CategoryBadge";

const columnHelper = createColumnHelper<AllTransactionRow>();

// A real HTML <table> can't be virtualized cleanly — absolutely-positioning
// <tr> rows (what row virtualization needs) breaks a table's own column-width
// negotiation, since detached rows no longer participate in it. This grid
// template is what keeps the header and every virtualized row's columns
// aligned instead.
const GRID_TEMPLATE = "116px minmax(0,1.6fr) 170px 150px 130px";

const columns = [
  columnHelper.accessor("date", { header: "Date" }),
  columnHelper.accessor("description", { header: "Description" }),
  columnHelper.accessor((row) => row.category ?? "", { id: "category", header: "Category" }),
  columnHelper.accessor((row) => row.bankName ?? row.source, { id: "source", header: "Bank" }),
  columnHelper.accessor((row) => (row.direction === "credit" ? 1 : -1) * Number(row.amount), {
    id: "amount",
    header: "Amount",
  }),
];

const ROW_HEIGHT = 52;

export function AllTransactionsTable({ transactions }: { transactions: AllTransactionRow[] }) {
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>([{ id: "date", desc: true }]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const table = useReactTable({
    data: transactions,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });
  const virtualRows = virtualizer.getVirtualItems();

  return (
    <div>
      <div
        className="grid border-y border-line text-left text-xs uppercase tracking-wide text-text-400"
        style={{ gridTemplateColumns: GRID_TEMPLATE }}
      >
        {table.getHeaderGroups()[0]!.headers.map((header) => {
          const sorted = header.column.getIsSorted();
          const isAmount = header.column.id === "amount";
          return (
            <button
              key={header.id}
              type="button"
              onClick={header.column.getToggleSortingHandler()}
              className={cn(
                "flex items-center gap-1 px-5 py-2.5 font-medium hover:text-text-100",
                isAmount && "flex-row-reverse text-right"
              )}
            >
              {flexRender(header.column.columnDef.header, header.getContext())}
              {sorted === "asc" && <ArrowUp className="h-3 w-3" strokeWidth={2} />}
              {sorted === "desc" && <ArrowDown className="h-3 w-3" strokeWidth={2} />}
              {!sorted && <ChevronsUpDown className="h-3 w-3 opacity-40" strokeWidth={2} />}
            </button>
          );
        })}
      </div>

      <div ref={scrollRef} className="max-h-[600px] overflow-y-auto">
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualRows.map((virtualRow) => {
            const row = rows[virtualRow.index]!;
            const original = row.original;
            const statementId = original.statementId;

            return (
              <div
                key={row.id}
                onClick={() => statementId && navigate(`/statements/${statementId}`)}
                className={cn(
                  "absolute left-0 top-0 grid w-full items-center border-b border-line text-sm",
                  statementId && "cursor-pointer hover:bg-ink-850"
                )}
                style={{
                  gridTemplateColumns: GRID_TEMPLATE,
                  height: ROW_HEIGHT,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="whitespace-nowrap px-5 font-mono tabular text-text-400">
                  {formatDate(original.date)}
                </div>
                <div className="truncate px-5 text-text-100">{original.description}</div>
                <div className="px-5">
                  <CategoryBadge category={original.category} />
                </div>
                <div className="truncate px-5">
                  {original.source === "telegram" ? (
                    <span className="inline-flex items-center gap-1.5 text-text-400">
                      <Send className="size-3.5 shrink-0" strokeWidth={1.8} />
                      {original.bankName ?? "Cash"}
                    </span>
                  ) : (
                    (original.bankName ?? <span className="text-text-600">—</span>)
                  )}
                </div>
                <div
                  className={cn(
                    "whitespace-nowrap px-5 text-right font-mono tabular",
                    original.direction === "credit" ? "text-moss-400" : "text-rust-400"
                  )}
                >
                  {original.direction === "credit" ? "+" : "−"}
                  {formatCurrency(Number(original.amount), original.currency)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
