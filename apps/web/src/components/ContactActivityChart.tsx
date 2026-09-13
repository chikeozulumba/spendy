import { useId } from "react";
import { ListFilter } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { formatCurrency } from "../lib/formatCurrency";
import { AXIS_INK, GRIDLINE } from "../palette";
import type { ContactAnalytics } from "../types";
import { TONE_HEX } from "./ui/Badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/Card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "./ui/chart";
import { ContactTypeBadge } from "./ui/ContactTypeBadge";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const config: ChartConfig = {
  count: { label: "Transactions", color: TONE_HEX.moss },
};

/**
 * Who the user transacted with most, in the selected year, plotted as a
 * monthly transaction-count area — volume of contact, not amount, since
 * "most active" is about frequency of interaction rather than how much
 * money moved.
 */
export function ContactActivityChart({
  analytics,
  onSelectContact,
}: {
  analytics: ContactAnalytics;
  /** Opens a transactions modal scoped to this same contact + year — the
   * "list of all the transactions pertaining to the scope of the chart". */
  onSelectContact?: () => void;
}) {
  const gradientUid = useId();
  const { topContact } = analytics;
  const data = analytics.monthly.map((m) => ({
    month: MONTH_LABELS[m.month - 1],
    count: m.count,
  }));
  const net = topContact
    ? Number(topContact.totalDebit) - Number(topContact.totalCredit)
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
          <div>
            <CardTitle>Most active contact</CardTitle>
            <CardDescription>
              {topContact
                ? `${topContact.transactionCount} transaction${topContact.transactionCount === 1 ? "" : "s"} in ${analytics.year}`
                : `No contact activity in ${analytics.year}`}
            </CardDescription>
          </div>
          {topContact && (
            <button
              type="button"
              onClick={onSelectContact}
              className="flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 transition-colors hover:border-line-strong hover:bg-ink-850"
            >
              <span className="font-semibold text-text-100">{topContact.name}</span>
              <ContactTypeBadge type={topContact.type} />
              <ListFilter className="size-3.5 text-text-400" strokeWidth={1.8} />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!topContact ? (
          <p className="text-text-400">
            No transactions linked to a contact this year.
          </p>
        ) : (
          <>
            <ChartContainer config={config} className="h-[280px] w-full">
              <AreaChart
                data={data}
                margin={{ left: 16, right: 16, top: 4, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id={`${gradientUid}-count`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={TONE_HEX.moss}
                      stopOpacity={0.5}
                    />
                    <stop
                      offset="95%"
                      stopColor={TONE_HEX.moss}
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={GRIDLINE} vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke={AXIS_INK}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 12 }}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      indicator="dot"
                      formatter={(value) =>
                        `${value} transaction${value === 1 ? "" : "s"}`
                      }
                    />
                  }
                />
                <Area
                  type="natural"
                  dataKey="count"
                  name="count"
                  stroke={TONE_HEX.moss}
                  fill={`url(#${gradientUid}-count)`}
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
            <p className="mt-3 text-sm text-text-400">
              Net {net >= 0 ? "sent" : "received"}:{" "}
              <span className="font-mono tabular font-medium text-text-100">
                {formatCurrency(Math.abs(net), analytics.primaryCurrency)}
              </span>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
