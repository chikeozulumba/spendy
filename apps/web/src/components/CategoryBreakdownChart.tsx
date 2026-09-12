import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CategoryBreakdownRow } from "../types";
import { AXIS_INK, GRIDLINE, colorForCategory } from "../palette";
import { formatCurrency, formatCurrencyCompact } from "../lib/formatCurrency";

export default function CategoryBreakdownChart({
  rows,
  currency,
}: {
  rows: CategoryBreakdownRow[];
  currency: string;
}) {
  const data = rows
    .filter((r) => r.category)
    .map((r) => ({ category: r.category as string, total: Number(r.total) }))
    .sort((a, b) => b.total - a.total);

  if (data.length === 0) {
    return <p className="text-text-400">No spending categorized yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
        <CartesianGrid horizontal={false} stroke={GRIDLINE} />
        <XAxis
          type="number"
          stroke={AXIS_INK}
          tickFormatter={(v) => formatCurrencyCompact(v, currency)}
        />
        <YAxis type="category" dataKey="category" stroke={AXIS_INK} width={130} />
        <Tooltip
          formatter={(value: number) => [formatCurrency(value, currency), "Spent"]}
          contentStyle={{ background: "#fdfdfd", border: "1px solid #e1e4e8", borderRadius: 8 }}
          labelStyle={{ color: "#14171a" }}
        />
        <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={28}>
          {data.map((row) => (
            <Cell key={row.category} fill={colorForCategory(row.category)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
