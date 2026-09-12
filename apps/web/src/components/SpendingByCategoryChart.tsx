import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
  const [hiddenYears, setHiddenYears] = useState<Set<number>>(new Set());

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

  function toggleYear(year: number) {
    setHiddenYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  }

  return (
    <div>
      <ChartContainer config={config} className="h-[300px] w-full">
        <BarChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: 24 }}>
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
          {years.map((year, i) => (
            <Bar
              key={year}
              dataKey={String(year)}
              name={String(year)}
              fill={colorForYear(i)}
              radius={[3, 3, 0, 0]}
              hide={hiddenYears.has(year)}
            />
          ))}
        </BarChart>
      </ChartContainer>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
        {years.map((year, i) => {
          const isHidden = hiddenYears.has(year);
          return (
            <button
              key={year}
              type="button"
              onClick={() => toggleYear(year)}
              aria-pressed={!isHidden}
              className="flex items-center gap-1.5 text-xs transition-opacity"
              style={{ opacity: isHidden ? 0.4 : 1 }}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: colorForYear(i) }}
              />
              <span className={isHidden ? "text-text-600 line-through" : "text-text-400"}>
                {year}
              </span>
            </button>
          );
        })}
      </div>

      {excludedOtherCurrency && (
        <p className="mt-3 text-xs text-text-600">
          Showing {primaryCurrency} only — statements in other currencies aren't included in
          this chart.
        </p>
      )}
    </div>
  );
}
