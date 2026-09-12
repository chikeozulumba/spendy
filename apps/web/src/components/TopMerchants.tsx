import type { TopMerchantRow } from "../types";
import { formatCurrency } from "../lib/formatCurrency";

export default function TopMerchants({
  rows,
  currency,
}: {
  rows: TopMerchantRow[];
  currency: string;
}) {
  if (rows.length === 0) return <p className="text-text-400">No merchants yet.</p>;

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
        {rows.map((row) => (
          <tr key={row.description} className="border-b border-line last:border-b-0">
            <td className="py-2.5 text-text-100">{row.description}</td>
            <td className="py-2.5 text-right font-mono tabular text-text-400">{row.count}</td>
            <td className="py-2.5 text-right font-mono tabular text-text-100">
              {formatCurrency(row.total, currency)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
