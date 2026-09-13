"use client";

import { useMemo } from "react";
import { Pie, PieChart, Sector } from "recharts";
// shadcn's reference uses a generic `shape` render-prop (receiving `index`)
// with a `PieSectorShapeProps` type from "recharts/types/polar/Pie" — both
// are Recharts v3. This repo is still on Recharts 2.15.4 (v3 is a very
// recent major release with real breaking changes elsewhere in this app's
// chart code — see the tanstack-table v8-vs-v9 history), where `<Pie>` has
// no `shape` prop at all; highlighting one sector is instead done via the
// older `activeIndex`/`activeShape` pair, and the per-sector prop type at
// the same file path is named `PieSectorDataItem` (no `index` field).
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCurrency } from "@/lib/formatCurrency";
import { colorForIndex } from "@/palette";
import type { SpendingByBankRow } from "@/types";
import type { PieSectorDataItem } from "recharts/types/polar/Pie";

export const description = "A donut chart with an active sector";

/**
 * Adapted from shadcn's Donut Chart - Active Sector
 * (https://ui.shadcn.com/charts/pie#charts-pie-donut-active). The "active"
 * sector highlights index 0 — since `chartData` is already sorted by spend
 * descending (same as the rest of this app's bank/category lists), that's
 * always the bank taking the largest share, not an arbitrary first row.
 *
 * Carried over from the previous (non-donut) version of this chart, both
 * still real fixes rather than stylistic choices:
 * - Each row's `fill` is the actual resolved color, not shadcn's
 *   `var(--color-KEY)` indirection — neither a bank name (arbitrary
 *   LLM-inferred text — spaces, "&", etc.) nor a React `useId()` value
 *   (contains literal colons) survives being interpolated into a bare CSS
 *   custom-property name, so that mechanism silently rendered every slice
 *   black instead of throwing.
 * - `startAngle`/`endAngle` are set explicitly — Recharts' defaults left a
 *   real gap uncovered here (the last slice's end point never met the
 *   first's start).
 * - The footer states only what's actually true of the data (no fabricated
 *   "Trending up by 5.2%" — there's no real trend metric for "total spend
 *   per bank" in this app).
 */
const ACTIVE_INDEX = 0;

export default function SpendingByBankChart({
  rows,
  primaryCurrency,
}: {
  rows: SpendingByBankRow[];
  primaryCurrency: string;
}) {
  const { chartData, excludedOtherCurrency } = useMemo(() => {
    const inPrimary = rows.filter((r) => r.currency === primaryCurrency);
    const excludedOtherCurrency = inPrimary.length !== rows.length;

    const chartData = inPrimary
      .map((r) => ({ bank: r.bankName, total: Number(r.total) }))
      .sort((a, b) => b.total - a.total)
      .map((d, i) => ({ ...d, fill: colorForIndex(i) }));

    return { chartData, excludedOtherCurrency };
  }, [rows, primaryCurrency]);

  const config: ChartConfig = Object.fromEntries(
    chartData.map((d, i) => [
      `bank-${i}`,
      { label: d.bank, color: colorForIndex(i) },
    ]),
  );

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-4">
        <CardTitle>Spending by bank</CardTitle>
        <CardDescription>
          Total spend across all your statements
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-text-400">
            No categorized spending yet — once a statement finishes processing,
            this will show how much each bank has taken in.
          </p>
        ) : (
          <ChartContainer
            config={config}
            className="mx-auto aspect-square max-h-[250px]"
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideLabel
                    formatter={(value) =>
                      formatCurrency(value as number, primaryCurrency)
                    }
                  />
                }
              />
              <Pie
                data={chartData}
                dataKey="total"
                nameKey="bank"
                innerRadius={60}
                strokeWidth={5}
                stroke="var(--color-ink-900)"
                // Explicit start/end angle: relying on Recharts' defaults left a
                // real ~120° gap uncovered for this data (the last slice's end
                // point never met the first slice's start point).
                startAngle={90}
                endAngle={-270}
                // Recharts 2.15.4 has a real bug here: with `activeShape` set,
                // its enter animation for the *inactive* sectors never
                // commits their <path> elements to the DOM (verified via
                // direct SVG inspection — only the active sector's path
                // exists until this is disabled). Turning off animation
                // sidesteps the broken transition entirely.
                isAnimationActive={false}
                activeIndex={ACTIVE_INDEX}
                activeShape={({
                  outerRadius = 0,
                  ...props
                }: PieSectorDataItem) => (
                  <Sector {...props} outerRadius={outerRadius + 10} />
                )}
              />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
      {chartData.length > 0 && (
        <CardFooter className="flex-col gap-2 text-sm">
          <div className="leading-none text-text-400">
            {chartData.length} bank{chartData.length === 1 ? "" : "s"} tracked
            across your statements
          </div>
          {excludedOtherCurrency && (
            <div className="leading-none text-text-600">
              Showing {primaryCurrency} only — statements in other currencies
              aren't included
            </div>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
