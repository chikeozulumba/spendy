import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import type { SpendingByYearRow } from "../types";
import { CATEGORIES } from "../types";
import { colorForCategory, GRIDLINE, AXIS_INK } from "../palette";
import { formatCurrency, formatCurrencyCompact } from "../lib/formatCurrency";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "./ui/chart";

export default function SpendingByCategoryChart({
  rows,
  primaryCurrency,
}: {
  rows: SpendingByYearRow[];
  primaryCurrency: string;
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const { data, categories, excludedOtherCurrency } = useMemo(() => {
    const inPrimary = rows.filter((r) => r.currency === primaryCurrency);
    const excludedOtherCurrency = inPrimary.length !== rows.length;

    if (inPrimary.length === 0) {
      return { data: [], categories: [] as string[], excludedOtherCurrency };
    }

    const years = inPrimary.map((r) => r.year);
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    const present = new Set(inPrimary.map((r) => r.category));
    // Stable, familiar ordering (matches the rest of the app) rather than
    // whatever order the DB happened to return rows in.
    const categories = CATEGORIES.filter((c) => present.has(c));

    const byYear = new Map<number, Record<string, number>>();
    for (let y = minYear; y <= maxYear; y++) {
      byYear.set(y, Object.fromEntries(categories.map((c) => [c, 0])));
    }
    for (const row of inPrimary) {
      const entry = byYear.get(row.year);
      if (entry) entry[row.category] = Number(row.total);
    }

    const data = Array.from(byYear.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, totals]) => ({ year, ...totals }));

    return { data, categories, excludedOtherCurrency };
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
    categories.map((c) => [c, { label: c, color: colorForCategory(c) }])
  );

  function toggle(category: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  return (
    <div>
      <ChartContainer config={config} className="h-[280px] w-full">
        <LineChart data={data} margin={{ left: 8, right: 16, top: 8 }}>
          <CartesianGrid stroke={GRIDLINE} vertical={false} />
          <XAxis dataKey="year" stroke={AXIS_INK} tick={{ fontSize: 12 }} />
          <YAxis
            stroke={AXIS_INK}
            tickFormatter={(v) => formatCurrencyCompact(v, primaryCurrency)}
            width={64}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => formatCurrency(value as number, primaryCurrency)}
              />
            }
          />
          {categories.map((category) => (
            <Line
              key={category}
              type="monotone"
              dataKey={category}
              name={category}
              stroke={colorForCategory(category)}
              strokeWidth={2}
              dot={{ r: 3 }}
              hide={hidden.has(category)}
            />
          ))}
        </LineChart>
      </ChartContainer>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        {categories.map((category) => {
          const isHidden = hidden.has(category);
          return (
            <button
              key={category}
              type="button"
              onClick={() => toggle(category)}
              aria-pressed={!isHidden}
              className="flex items-center gap-1.5 text-xs transition-opacity"
              style={{ opacity: isHidden ? 0.4 : 1 }}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: colorForCategory(category) }}
              />
              <span className={isHidden ? "text-text-600 line-through" : "text-text-400"}>
                {category}
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
