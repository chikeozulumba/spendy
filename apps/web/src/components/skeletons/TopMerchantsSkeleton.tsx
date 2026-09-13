import { Skeleton } from "../ui/Skeleton";

/** Mirrors TopMerchants' table (Merchant / Transactions / Total spent). */
export function TopMerchantsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-text-400">
          <th className="py-2 font-medium">Merchant</th>
          <th className="py-2 font-medium text-right">Transactions</th>
          <th className="py-2 font-medium text-right">Total spent</th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <tr key={i} className="border-b border-line last:border-b-0">
            <td className="py-2.5">
              <Skeleton className="h-4 w-32" />
            </td>
            <td className="py-2.5 text-right">
              <Skeleton className="ml-auto h-4 w-6" />
            </td>
            <td className="py-2.5 text-right">
              <Skeleton className="ml-auto h-4 w-16" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
