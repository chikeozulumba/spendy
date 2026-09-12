import { useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";
import type { SpendingByBankRow } from "../types";
import { colorForIndex } from "../palette";
import { formatCurrency } from "../lib/formatCurrency";
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

  const config: ChartConfig = Object.fromEntries(
    data.map((d, i) => [d.bank, { label: d.bank, color: colorForIndex(i) }])
  );

  return (
    <div>
      <ChartContainer config={config} className="mx-auto h-[280px] w-full max-w-[280px]">
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => formatCurrency(value as number, primaryCurrency)}
              />
            }
          />
          <Pie
            data={data}
            dataKey="total"
            nameKey="bank"
            // Explicit start/end angle: relying on Recharts' defaults here left
            // a ~120° gap uncovered (the last slice's end point never met the
            // first slice's start point) — this is the standard fix, forcing
            // a full clockwise sweep from 12 o'clock.
            startAngle={90}
            endAngle={-270}
            innerRadius={0}
            outerRadius={110}
            paddingAngle={2}
          >
            {data.map((d, i) => (
              <Cell key={d.bank} fill={colorForIndex(i)} stroke="none" />
            ))}
          </Pie>
        </PieChart>
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
