import { Skeleton } from "../ui/Skeleton";

/**
 * Mirrors the actual <table>/<th>/<td> markup + spacing that LedgerTable and
 * TransactionsTable render (same px-5 py-3 cells, same border-b rows) so the
 * loading state doesn't visibly shift once real rows swap in. Real column
 * headers are shown as-is (they're static, not data-dependent) — only the
 * body cells are skeletons.
 */
export function TableSkeleton({
  columns,
  rows = 6,
}: {
  columns: { header: string; width?: string }[];
  rows?: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-y border-line text-left text-xs uppercase tracking-wide text-text-400">
            {columns.map((col) => (
              <th key={col.header} className="px-5 py-2.5 font-medium">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="border-b border-line last:border-b-0">
              {columns.map((col) => (
                <td key={col.header} className="px-5 py-3">
                  <Skeleton className="h-4" style={{ width: col.width ?? "70%" }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
