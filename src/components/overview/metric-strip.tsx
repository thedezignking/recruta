import Link from "next/link";
import type { ComponentType } from "react";
import { ActivityChart } from "./activity-chart";
import type { OverviewRange } from "@/lib/overview-range";

export type MetricItem = {
  label: string;
  value: number;
  icon: ComponentType<{
    size?: number;
    strokeWidth?: number;
    "aria-hidden"?: boolean;
  }>;
  href: string;
  trend?: number[];
  activityLabel: string;
  previous?: number;
  color: string;
  iconSurface: string;
};

export function MetricStrip({
  metrics,
  range,
  periods,
  comparisonLabel,
  idPrefix,
}: {
  metrics: MetricItem[];
  range: OverviewRange;
  periods?: { since: string; until: string }[];
  comparisonLabel?: string;
  idPrefix: string;
}) {
  return (
    <div
      className={`mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border ${metrics.length === 5 ? "xl:grid-cols-5" : "xl:grid-cols-4"}`}
    >
      {metrics.map((metric, index) => {
        const difference =
          metric.previous === undefined ? 0 : metric.value - metric.previous;
        const changeColor =
          difference > 0
            ? "text-success"
            : difference < 0
              ? "text-destructive"
              : "text-muted-foreground";
        const countId = `${idPrefix}-${metric.label.toLowerCase().replaceAll(" ", "-")}-count`;
        return (
          <div
            key={metric.label}
            className={`min-w-0 bg-card p-4 sm:p-5 ${metrics.length % 2 === 1 && index === metrics.length - 1 ? "col-span-2 xl:col-span-1" : ""}`}
          >
            <Link
              href={metric.href}
              aria-label={`View all ${metric.label.toLowerCase()}`}
              aria-describedby={countId}
              className="block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <p className="text-[13px] leading-5 text-muted-foreground">
                {metric.label}
              </p>
              <p
                id={countId}
                className="mt-2 text-[26px] leading-none font-semibold tracking-[-0.045em] text-foreground tabular-nums"
              >
                {metric.value}
              </p>
              {metric.previous !== undefined && (
                <p
                  className={`mt-2 text-xs tabular-nums ${range === "all" ? (metric.previous > 0 ? "text-success" : "text-muted-foreground") : difference === 0 ? "text-muted-foreground" : changeColor}`}
                >
                  {range === "all" ? (
                    <>
                      {metric.previous > 0 ? "+" : ""}
                      {metric.previous.toLocaleString()} in the last 30 days
                    </>
                  ) : (
                    <>
                      {difference > 0 ? "+" : ""}
                      {difference.toLocaleString()} vs {comparisonLabel}
                    </>
                  )}
                </p>
              )}
            </Link>
            {metric.trend && periods && (
              <div
                className={`mt-4 ${index % 2 === 0 ? "text-[#7D7BF0]" : "text-[#F2A57F]"}`}
              >
                <ActivityChart
                  values={metric.trend}
                  periods={periods}
                  range={range}
                  activityLabel={metric.activityLabel}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
