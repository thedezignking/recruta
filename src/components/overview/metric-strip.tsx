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
    <div className="mt-4 grid grid-cols-2 rounded-lg border border-border xl:grid-cols-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        const difference =
          metric.previous === undefined ? 0 : metric.value - metric.previous;
        const percentage = metric.previous
          ? Math.round((difference / metric.previous) * 100)
          : null;
        const changeColor =
          difference > 0
            ? "text-success"
            : difference < 0
              ? "text-destructive"
              : "text-foreground";
        const countId = `${idPrefix}-${metric.label.toLowerCase().replaceAll(" ", "-")}-count`;
        return (
          <div
            key={metric.label}
            className={`min-w-0 p-4 sm:p-5 ${index === 0 ? "border-r border-b xl:border-b-0" : index === 1 ? "border-b xl:border-r xl:border-b-0" : index === 2 ? "border-r" : ""}`}
          >
            <Link
              href={metric.href}
              aria-label={`View all ${metric.label.toLowerCase()}`}
              aria-describedby={countId}
              className="block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium leading-5 text-foreground">
                  {metric.label}
                </p>
                <span
                  className={`grid size-[34px] shrink-0 place-items-center rounded-[10px] text-white shadow-[inset_0_1px_0_rgb(255_255_255_/_0.18)] ${metric.iconSurface}`}
                >
                  <Icon aria-hidden={true} size={18} strokeWidth={2} />
                </span>
              </div>
              <p
                id={countId}
                className="mt-1 text-[26px] leading-none font-semibold tracking-[-0.045em] text-foreground tabular-nums"
              >
                {metric.value}
              </p>
              {metric.previous !== undefined && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {range === "all" ? (
                    <>
                      <span
                        className={`font-semibold tabular-nums ${metric.previous > 0 ? "text-success" : "text-foreground"}`}
                      >
                        {metric.previous > 0 ? "+" : ""}
                        {metric.previous.toLocaleString()}
                      </span>{" "}
                      in the last 30 days
                    </>
                  ) : (
                    <>
                      <span
                        className={`font-semibold tabular-nums ${changeColor}`}
                      >
                        {difference > 0 ? "+" : ""}
                        {difference.toLocaleString()}
                      </span>
                      {percentage !== null && (
                        <span className={`ml-1 tabular-nums ${changeColor}`}>
                          ({percentage > 0 ? "+" : ""}
                          {percentage}%)
                        </span>
                      )}{" "}
                      vs {comparisonLabel}
                    </>
                  )}
                </p>
              )}
            </Link>
            {metric.trend && periods && (
              <div className={`mt-4 ${metric.color}`}>
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
