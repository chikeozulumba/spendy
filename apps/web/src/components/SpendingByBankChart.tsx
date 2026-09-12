import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { SpendingByBankRow } from "../types";
import { AXIS_INK, DEBIT_COLOR, GRIDLINE } from "../palette";
import { formatCurrency, formatCurrencyCompact, estimateYAxisWidth } from "../lib/formatCurrency";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "./ui/chart";

export default function SpendingByBankChart({
  rows,
  primaryCurrency,
}: {
  rows: SpendingByBankRow[];
  primaryCurrency: string;
}) {
  const { data, excludedOtherCurrency } = useMemo(() => {
    const inPrimary = rows.filter((r) => r.currency === primaryCurrency);
    const excludedOtherCurrency = inPrimary.length !== rows.length;

    const data = inPrimary
      .map((r) => ({ bank: r.bankName, total: Number(r.total) }))
      .sort((a, b) => b.total - a.total);

    return { data, excludedOtherCurrency };
  }, [rows, primaryCurrency]);

  if (data.length === 0) {
    return (
      <p className="text-text-400">
        No categorized spending yet — once a statement finishes processing, this will show
        how much each bank has taken in.
      </p>
    );
  }

  // A single series, direct-labeled by the x-axis — no per-item color coding
  // needed, so this just reuses the app's existing "money out" convention.
  const config: ChartConfig = { total: { label: "Spent", color: DEBIT_COLOR } };
  const maxValue = data[0]?.total ?? 0; // `data` is sorted descending above

  return (
    <div>
      <ChartContainer config={config} className="h-[300px] w-full">
        <BarChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: 24 }}>
          <CartesianGrid stroke={GRIDLINE} vertical={false} />
          <XAxis
            dataKey="bank"
            stroke={AXIS_INK}
            tick={{ fontSize: 11 }}
            interval={0}
            angle={-30}
            textAnchor="end"
            height={60}
          />
          <YAxis
            stroke={AXIS_INK}
            tickFormatter={(v) => formatCurrencyCompact(v, primaryCurrency)}
            width={estimateYAxisWidth(maxValue, primaryCurrency)}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => formatCurrency(value as number, primaryCurrency)}
              />
            }
          />
          <Bar dataKey="total" name="Spent" fill={DEBIT_COLOR} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ChartContainer>

      {excludedOtherCurrency && (
        <p className="mt-3 text-xs text-text-600">
          Showing {primaryCurrency} only — statements in other currencies aren't included in
          this chart.
        </p>
      )}
    </div>
  );
}
