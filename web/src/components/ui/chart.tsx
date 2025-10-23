"use client";

import * as React from "react";
import type { TooltipProps } from "recharts";
import { Tooltip as RechartsTooltip } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  {
    label: string;
    color?: string;
  }
>;

type ChartContextValue = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextValue>({
  config: {},
});

export function useChartConfig() {
  return React.useContext(ChartContext).config;
}

type ChartContainerProps = React.HTMLAttributes<HTMLDivElement> & {
  config: ChartConfig;
};

export const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ className, config, style, children, ...props }, ref) => {
    const cssVars: React.CSSProperties = { ...(style ?? {}) };
    for (const [key, value] of Object.entries(config)) {
      if (value?.color) {
        (cssVars as Record<string, string>)[`--chart-${key}`] = value.color;
      }
    }

    return (
      <ChartContext.Provider value={{ config }}>
        <div
          ref={ref}
          className={cn("flex h-full w-full flex-col justify-center", className)}
          style={cssVars}
          {...props}
        >
          {children}
        </div>
      </ChartContext.Provider>
    );
  }
);
ChartContainer.displayName = "ChartContainer";

type ChartTooltipProps = React.ComponentPropsWithoutRef<typeof RechartsTooltip>;

export function ChartTooltip(props: ChartTooltipProps) {
  return <RechartsTooltip {...props} />;
}

type ChartTooltipContentProps = TooltipProps<ValueType, NameType> & {
  className?: string;
  indicator?: "dot" | "line";
  labelFormatter?: (value: string | number) => React.ReactNode;
  valueFormatter?: (value: ValueType) => React.ReactNode;
};

export function ChartTooltipContent({
  active,
  payload,
  label,
  className,
  labelFormatter,
  valueFormatter,
}: ChartTooltipContentProps) {
  const config = useChartConfig();

  if (!active || !payload?.length) {
    return null;
  }

  const formattedLabel =
    labelFormatter && label != null ? labelFormatter(label) : label;

  return (
    <div
      className={cn(
        "grid gap-2 rounded-lg border border-border/60 bg-background/85 p-3 text-xs shadow-lg backdrop-blur",
        className
      )}
    >
      {formattedLabel ? (
        <div className="font-medium text-foreground">{formattedLabel}</div>
      ) : null}
      <div className="grid gap-1">
        {payload.map((item) => {
          if (!item) return null;
          const key = String(item.dataKey ?? "");
          const conf = config[key];
          const color = conf?.color ?? item.color ?? "hsl(var(--foreground))";
          const rawValue = item.value;
          let formattedValue: React.ReactNode;

          if (valueFormatter) {
            formattedValue = valueFormatter(rawValue);
          } else if (typeof rawValue === "number") {
            formattedValue = rawValue.toLocaleString();
          } else if (Array.isArray(rawValue)) {
            formattedValue = rawValue.map((val) => String(val)).join(", ");
          } else {
            formattedValue = rawValue ?? "0";
          }

          return (
            <div key={key} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span>{conf?.label ?? key}</span>
              </div>
              <span className="font-medium text-foreground">{formattedValue}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
