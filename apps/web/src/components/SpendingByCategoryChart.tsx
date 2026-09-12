import { useId, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { SpendingByYearRow } from "../types";
import { CATEGORIES } from "../types";
import { colorForYear, GRIDLINE, AXIS_INK } from "../palette";
import { formatCurrency, formatCurrencyCompact, estimateYAxisWidth } from "../lib/formatCurrency";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "./ui/chart";

export default function SpendingByCategoryChart({
  rows,
  primaryCurrency,
}: {
  rows: SpendingByYearRow[];
  primaryCurrency: string;
}) {
  const gradientUid = useId();

  const { data, years, excludedOtherCurrency, maxValue } = useMemo(() => {
    const inPrimary = rows.filter((r) => r.currency === primaryCurrency);
    const excludedOtherCurrency = inPrimary.length !== rows.length;

    if (inPrimary.length === 0) {
      return { data: [], years: [] as number[], excludedOtherCurrency, maxValue: 0 };
    }

    const years = Array.from(new Set(inPrimary.map((r) => r.year))).sort((a, b) => a - b);

    const present = new Set(inPrimary.map((r) => r.category));
    // Stable, familiar ordering (matches the rest of the app) rather than
    // whatever order the DB happened to return rows in.
    const categories = CATEGORIES.filter((c) => present.has(c));

    const byCategory = new Map<string, Record<string, number>>();
    for (const category of categories) {
      byCategory.set(
        category,
        Object.fromEntries(years.map((y) => [String(y), 0]))
      );
    }
    for (const row of inPrimary) {
      const entry = byCategory.get(row.category);
      if (entry) entry[String(row.year)] = Number(row.total);
    }

    const data = categories.map((category) => ({
      category,
      ...byCategory.get(category)!,
    }));

    const maxValue = Math.max(...inPrimary.map((r) => Number(r.total)));

    return { data, years, excludedOtherCurrency, maxValue };
  }, [rows, primaryCurrency]);

  if (data.length === 0) {
    return (
      <p className="text-text-400">
        No categorized spending yet — once a statement finishes processing, your spending
        trends will show up here.
      </p>
    );
  }

  const config: ChartConfig = Object.fromEntries(
    years.map((year, i) => [String(year), { label: String(year), color: colorForYear(i) }])
  );

  return (
    <div>
      <ChartContainer config={config} className="h-[300px] w-full">
        <AreaChart data={data} margin={{ left: 8, right: 8, top: 4, bottom: 16 }}>
          <defs>
            {years.map((year, i) => (
              <linearGradient key={year} id={`${gradientUid}-${year}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colorForYear(i)} stopOpacity={0.5} />
                <stop offset="95%" stopColor={colorForYear(i)} stopOpacity={0.05} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke={GRIDLINE} vertical={false} />
          <XAxis
            dataKey="category"
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
          {/* Not stacked: each year is an independent trend to compare, not an
              additive part of one total, so stacking them would sum unrelated
              years together and misrepresent the data. */}
          {years.map((year, i) => (
            <Area
              key={year}
              type="natural"
              dataKey={String(year)}
              name={String(year)}
              stroke={colorForYear(i)}
              fill={`url(#${gradientUid}-${year})`}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
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
