import { useId } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import type { SpendOverTimeRow } from "../types";
import { GRIDLINE, AXIS_INK, CREDIT_COLOR, DEBIT_COLOR } from "../palette";
import { formatDate, formatDateShort } from "../lib/formatDate";
import { formatCurrency } from "../lib/formatCurrency";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/Card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "./ui/chart";

const config: ChartConfig = {
  debit: { label: "Spent", color: DEBIT_COLOR },
  credit: { label: "Received", color: CREDIT_COLOR },
};

/**
 * Same chart type as the home page's "Spending by category, by year"
 * (shadcn's Interactive Area Chart pattern): self-contained Card with a
 * header, gradient-filled unstacked areas, a legend, tooltip-only values
 * (no y-axis). Debit/credit are opposite flows, not additive parts of one
 * total, so — same as that chart — they're left unstacked; stacking would
 * sum money in and money out together into a number that means nothing.
 */
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spend over time</CardTitle>
        <CardDescription>Money in vs. money out across this statement</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-text-400">No transactions yet.</p>
        ) : (
          <ChartContainer config={config} className="h-[280px] w-full">
            <AreaChart data={data} margin={{ left: 16, right: 16, top: 4, bottom: 0 }}>
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
              <XAxis
                dataKey="date"
                stroke={AXIS_INK}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 12 }}
                tickFormatter={formatDateShort}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    labelFormatter={(label) => formatDate(label as string)}
                    formatter={(value) => formatCurrency(value as number, currency)}
                  />
                }
              />
              <Area
                type="natural"
                dataKey="debit"
                name="debit"
                stroke={DEBIT_COLOR}
                fill={`url(#${gradientUid}-debit)`}
                strokeWidth={2}
              />
              <Area
                type="natural"
                dataKey="credit"
                name="credit"
                stroke={CREDIT_COLOR}
                fill={`url(#${gradientUid}-credit)`}
                strokeWidth={2}
              />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
