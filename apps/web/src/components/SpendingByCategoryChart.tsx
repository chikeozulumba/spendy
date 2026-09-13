"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  SelectRoot as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { formatCurrency } from "@/lib/formatCurrency";
import { shortenLabel } from "@/lib/shortenLabel";
import { AXIS_INK, colorForYear, GRIDLINE } from "@/palette";
import type { SpendingByYearRow } from "@/types";
import { CATEGORIES } from "@/types";
import { useId, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

export const description = "An interactive area chart";

/**
 * Adapted from shadcn's Interactive Area Chart
 * (https://ui.shadcn.com/charts/area#charts) to this app's own data shape:
 * that reference plots one continuous date axis with a day-count range
 * filter ("Last 3 months" / "30 days" / "7 days"). This chart's x-axis is
 * category (not a date), and each series is a *year* to compare rather than
 * a device type — so the analogous range control is "how many of the most
 * recent years to include" instead of a day count, and the two areas in the
 * reference (`stackId="a"` on both) are summed on purpose because desktop +
 * mobile visitors is a meaningful total. Years being compared side by side
 * are not additive that way, so these are intentionally left unstacked —
 * stacking them would sum unrelated years into a number that represents no
 * real period.
 *
 * Also matching the reference: no y-axis. Values are read via the tooltip
 * (on hover) and the legend/gradient identify which line is which year.
 */
export default function SpendingByCategoryChart({
  rows,
  primaryCurrency,
}: {
  rows: SpendingByYearRow[];
  primaryCurrency: string;
}) {
  const gradientUid = useId();
  const [yearRange, setYearRange] = useState("all");

  const { data, years, excludedOtherCurrency } = useMemo(() => {
    const inPrimary = rows.filter((r) => r.currency === primaryCurrency);
    const excludedOtherCurrency = inPrimary.length !== rows.length;

    if (inPrimary.length === 0) {
      return { data: [], years: [] as number[], excludedOtherCurrency };
    }

    const years = Array.from(new Set(inPrimary.map((r) => r.year))).sort(
      (a, b) => a - b,
    );

    const present = new Set(inPrimary.map((r) => r.category));
    // Stable, familiar ordering (matches the rest of the app) rather than
    // whatever order the DB happened to return rows in.
    const categories = CATEGORIES.filter((c) => present.has(c));

    const byCategory = new Map<string, Record<string, number>>();
    for (const category of categories) {
      byCategory.set(
        category,
        Object.fromEntries(years.map((y) => [String(y), 0])),
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

    return { data, years, excludedOtherCurrency };
  }, [rows, primaryCurrency]);

  const visibleYears = useMemo(() => {
    if (yearRange === "latest") return years.slice(-1);
    if (yearRange === "last2") return years.slice(-2);
    return years;
  }, [years, yearRange]);

  const config: ChartConfig = Object.fromEntries(
    years.map((year, i) => [
      String(year),
      { label: String(year), color: colorForYear(i) },
    ]),
  );

  return (
    <Card>
      <CardHeader className="flex!-col sm:flex-row items-center justify-between">
        <div className="flex-1">
          <CardTitle>Spending by category, by year</CardTitle>
          <CardDescription>
            Category totals across the years you've filed statements for
          </CardDescription>
        </div>
        {years.length > 1 && (
          <Select value={yearRange} onValueChange={setYearRange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All years</SelectItem>
              {years.length >= 2 && (
                <SelectItem value="latest">Latest year</SelectItem>
              )}
              {years.length >= 3 && (
                <SelectItem value="last2">Last 2 years</SelectItem>
              )}
            </SelectContent>
          </Select>
        )}
      </CardHeader>

      <CardContent>
        {data.length === 0 ? (
          <p className="text-text-400">
            No categorized spending yet — once a statement finishes processing,
            your spending trends will show up here.
          </p>
        ) : (
          <>
            <ChartContainer config={config} className="h-[300px] w-full">
              <AreaChart
                data={data}
                margin={{ left: 16, right: 40, top: 4, bottom: 0 }}
              >
                <defs>
                  {years.map((year, i) => (
                    <linearGradient
                      key={year}
                      id={`${gradientUid}-${year}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={colorForYear(i)}
                        stopOpacity={0.5}
                      />
                      <stop
                        offset="95%"
                        stopColor={colorForYear(i)}
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid stroke={GRIDLINE} vertical={false} />
                <XAxis
                  dataKey="category"
                  stroke={AXIS_INK}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 11 }}
                  interval={0}
                  tickFormatter={(value: string) => shortenLabel(value)}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      indicator="dot"
                      formatter={(value) =>
                        formatCurrency(value as number, primaryCurrency)
                      }
                    />
                  }
                />
                {visibleYears.map((year) => {
                  const i = years.indexOf(year);
                  return (
                    <Area
                      key={year}
                      dataKey={String(year)}
                      name={String(year)}
                      type="natural"
                      stroke={colorForYear(i)}
                      fill={`url(#${gradientUid}-${year})`}
                      strokeWidth={2}
                    />
                  );
                })}
                <ChartLegend content={<ChartLegendContent />} />
              </AreaChart>
            </ChartContainer>

            {excludedOtherCurrency && (
              <p className="mt-3 text-xs text-text-600">
                Showing {primaryCurrency} only — statements in other currencies
                aren't included in this chart.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
