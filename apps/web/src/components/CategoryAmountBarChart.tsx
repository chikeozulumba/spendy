"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import { colorForCategory, GRIDLINE } from "@/palette";
import { formatCurrency } from "@/lib/formatCurrency";
import { shortenLabel } from "@/lib/shortenLabel";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

/**
 * Adapted from shadcn's Bar Chart - Custom Label
 * (https://ui.shadcn.com/charts/bar#charts): both axes are hidden and the
 * category name + amount are rendered as inline labels on the bar itself —
 * this sidesteps the angled-axis-label-clipping problem entirely rather than
 * fighting it with margins.
 *
 * One deviation: the reference gives every bar the same flat
 * `fill="var(--color-desktop)"` (one series, so one color is correct there).
 * Categories aren't one series — this app colors a category the same way
 * everywhere (`colorForCategory`), so each bar keeps that per-category color
 * rather than a single uniform fill, via each row's own `fill` field (same
 * per-datum-fill mechanism as the pie chart) instead of a fixed value on
 * `<Bar>`.
 */
export default function CategoryAmountBarChart({
  title,
  description,
  data,
  currency,
}: {
  title: string;
  description?: string;
  data: { category: string; total: number }[];
  currency: string;
}) {
  const chartData = useMemo(
    () =>
      [...data]
        .filter((d) => d.total > 0)
        .sort((a, b) => b.total - a.total)
        .map((d) => ({ ...d, fill: colorForCategory(d.category) })),
    [data]
  );

  const config: ChartConfig = Object.fromEntries(
    chartData.map((d) => [d.category, { label: d.category, color: colorForCategory(d.category) }])
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-text-400">No categorized spending yet.</p>
        ) : (
          <ChartContainer
            config={config}
            className="w-full"
            style={{ height: Math.max(200, chartData.length * 40) }}
          >
            <BarChart data={chartData} layout="vertical" margin={{ right: 24 }}>
              <CartesianGrid horizontal={false} stroke={GRIDLINE} />
              <YAxis dataKey="category" type="category" tickLine={false} axisLine={false} hide />
              <XAxis dataKey="total" type="number" hide />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    formatter={(value) => formatCurrency(value as number, currency)}
                  />
                }
              />
              <Bar dataKey="total" radius={4}>
                {/* Full name on hover via the tooltip; the inline label is
                    shortened the same way the area chart's x-axis is —
                    a long category name doesn't reliably fit inside a bar
                    whose width is proportional to a small amount. */}
                <LabelList
                  dataKey="category"
                  position="insideLeft"
                  offset={8}
                  formatter={(value: string) => shortenLabel(value)}
                  fill="#fff"
                  fontSize={12}
                />
                <LabelList
                  dataKey="total"
                  position="right"
                  offset={8}
                  formatter={(value: number) => formatCurrency(value, currency)}
                  fill="var(--color-text-100)"
                  fontSize={12}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
