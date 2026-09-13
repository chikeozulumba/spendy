"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCurrency } from "@/lib/formatCurrency";
import { shortenLabel } from "@/lib/shortenLabel";
import { AXIS_INK, colorForIndex, GRIDLINE } from "@/palette";
import type { PeriodComparisonCategoryRow } from "@/types";

/**
 * Grouped (not stacked) bars — two <Bar> with no shared stackId — since
 * period A and B are being compared side by side, not summed. No legend
 * (matches this app's chart convention elsewhere): the two periods are
 * identified via each bar's own tooltip label instead, sourced from `config`.
 */
export default function PeriodComparisonChart({
  data,
  currency,
  labelA,
  labelB,
}: {
  data: PeriodComparisonCategoryRow[];
  currency: string;
  labelA: string;
  labelB: string;
}) {
  const colorA = colorForIndex(0);
  const colorB = colorForIndex(1);
  const config: ChartConfig = {
    totalA: { label: labelA, color: colorA },
    totalB: { label: labelB, color: colorB },
  };
  const chartData = [...data].sort((a, b) => b.totalB - a.totalB);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending by category</CardTitle>
        <CardDescription>
          {labelA} vs {labelB}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-text-400">No categorized spending in either period.</p>
        ) : (
          <ChartContainer config={config} className="h-[300px] w-full">
            <BarChart data={chartData} margin={{ left: 8, right: 8, top: 4, bottom: 0 }}>
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
                    formatter={(value) => formatCurrency(value as number, currency)}
                  />
                }
              />
              <Bar dataKey="totalA" fill={colorA} radius={4} />
              <Bar dataKey="totalB" fill={colorB} radius={4} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
