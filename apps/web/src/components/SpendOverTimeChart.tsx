import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SpendOverTimeRow } from "../types";
import { AXIS_INK, CREDIT_COLOR, DEBIT_COLOR, GRIDLINE } from "../palette";
import { formatDate, formatDateShort } from "../lib/formatDate";
import { formatCurrency, formatCurrencyCompact } from "../lib/formatCurrency";

export default function SpendOverTimeChart({
  rows,
  currency,
}: {
  rows: SpendOverTimeRow[];
  currency: string;
}) {
  const byDate = new Map<string, { date: string; debit: number; credit: number }>();
  for (const row of rows) {
    const entry = byDate.get(row.date) ?? { date: row.date, debit: 0, credit: 0 };
    entry[row.direction] = Number(row.total);
    byDate.set(row.date, entry);
  }
  const data = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));

  if (data.length === 0) {
    return <p className="text-text-400">No transactions yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ left: 8, right: 16 }}>
        <CartesianGrid stroke={GRIDLINE} vertical={false} />
        <XAxis dataKey="date" stroke={AXIS_INK} tick={{ fontSize: 12 }} tickFormatter={formatDateShort} />
        <YAxis stroke={AXIS_INK} tickFormatter={(v) => formatCurrencyCompact(v, currency)} />
        <Tooltip
          formatter={(value: number) => formatCurrency(value, currency)}
          labelFormatter={formatDate}
          contentStyle={{ background: "#0b0d10", border: "1px solid #262b26", borderRadius: 8 }}
          labelStyle={{ color: "#e7e4da" }}
        />
        <Legend />
        <Line type="monotone" dataKey="debit" name="Spent" stroke={DEBIT_COLOR} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="credit" name="Received" stroke={CREDIT_COLOR} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
