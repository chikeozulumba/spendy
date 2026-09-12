import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
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
  const gradientUid = useId();

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
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
        <defs>
          <linearGradient id={`${gradientUid}-debit`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={DEBIT_COLOR} stopOpacity={0.5} />
            <stop offset="95%" stopColor={DEBIT_COLOR} stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id={`${gradientUid}-credit`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CREDIT_COLOR} stopOpacity={0.5} />
            <stop offset="95%" stopColor={CREDIT_COLOR} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRIDLINE} vertical={false} />
        <XAxis dataKey="date" stroke={AXIS_INK} tick={{ fontSize: 12 }} tickFormatter={formatDateShort} />
        <YAxis stroke={AXIS_INK} tickFormatter={(v) => formatCurrencyCompact(v, currency)} />
        <Tooltip
          formatter={(value: number) => formatCurrency(value, currency)}
          labelFormatter={formatDate}
          contentStyle={{ background: "#fdfdfd", border: "1px solid #e1e4e8", borderRadius: 8 }}
          labelStyle={{ color: "#14171a" }}
        />
        {/* Not stacked: debit and credit are opposite flows, not additive parts
            of one total — stacking would sum money in and money out together. */}
        <Area
          type="natural"
          dataKey="debit"
          name="Spent"
          stroke={DEBIT_COLOR}
          fill={`url(#${gradientUid}-debit)`}
          strokeWidth={2}
        />
        <Area
          type="natural"
          dataKey="credit"
          name="Received"
          stroke={CREDIT_COLOR}
          fill={`url(#${gradientUid}-credit)`}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
