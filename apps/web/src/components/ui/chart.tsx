import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "../../lib/cn";

/**
 * shadcn's chart primitives (https://ui.shadcn.com/docs/components/chart),
 * trimmed to this app's dark-only theme: shadcn's original ships a
 * light/dark CSS-variable pair per series (`theme: { light, dark }`) so a
 * chart repaints when the app's color-mode toggle flips; this app has no
 * such toggle (`color-scheme: dark` is fixed in styles.css), so each series
 * takes a single `color` and ChartStyle emits one flat rule instead of two
 * media-queried ones. API surface (ChartContainer/ChartConfig/
 * ChartTooltipContent/ChartLegendContent) is otherwise the same shape.
 */

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    color: string;
  }
>;

type ChartContextProps = { config: ChartConfig };
const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) throw new Error("Chart components must be used within a <ChartContainer />");
  return context;
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        className={cn(
          "flex justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-text-600 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-line [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-sector]:outline-none [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-none",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const entries = Object.entries(config);
  if (!entries.length) return null;

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `[data-chart=${id}] {\n${entries
          .map(([key, item]) => `  --color-${key}: ${item.color};`)
          .join("\n")}\n}`,
      }}
    />
  );
}

const ChartTooltip = RechartsPrimitive.Tooltip;

interface ChartTooltipPayloadItem {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
  color?: string;
}

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  label,
  labelFormatter,
  formatter,
}: {
  active?: boolean;
  payload?: ChartTooltipPayloadItem[];
  label?: string | number;
  className?: string;
  indicator?: "dot" | "line";
  hideLabel?: boolean;
  labelFormatter?: (label: string | number) => React.ReactNode;
  formatter?: (value: number | string, name: string | number) => React.ReactNode;
}) {
  const { config } = useChart();

  if (!active || !payload?.length) return null;

  return (
    <div
      className={cn(
        "grid min-w-[10rem] gap-1.5 rounded-lg border border-line-strong bg-ink-850 px-3 py-2 text-xs",
        className
      )}
    >
      {!hideLabel && label !== undefined && (
        <div className="font-medium text-text-100">
          {labelFormatter ? labelFormatter(label) : label}
        </div>
      )}
      <div className="grid gap-1">
        {payload.map((item, i) => {
          const key = String(item.dataKey ?? item.name ?? i);
          const itemConfig = config[key];
          const color = item.color ?? itemConfig?.color;
          const value =
            formatter && item.value !== undefined
              ? formatter(item.value, item.name ?? key)
              : item.value;

          return (
            <div key={key} className="flex w-full items-center gap-2">
              <span
                className={cn(
                  "shrink-0 rounded-[2px]",
                  indicator === "dot" ? "h-2 w-2" : "h-[3px] w-3"
                )}
                style={{ backgroundColor: color }}
              />
              <div className="flex flex-1 items-center justify-between gap-3 leading-none">
                <span className="text-text-400">{itemConfig?.label ?? item.name}</span>
                <span className="font-mono tabular font-medium text-text-100">{value as React.ReactNode}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { ChartContainer, ChartTooltip, ChartTooltipContent, useChart };
