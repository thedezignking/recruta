"use client";

import { useRef, useState } from "react";
import type { OverviewRange } from "@/lib/overview-range";

type Period = { since: string; until: string };

function periodLabel(period: Period, range: OverviewRange) {
  const start = new Date(period.since);
  const end = new Date(period.until);
  const day = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });
  const startDay = day.format(start);
  const endDay = day.format(end);
  const span = end.getTime() - start.getTime();
  if (range === "24h" || (range === "all" && span < 2 * 86400000)) {
    const time = new Intl.DateTimeFormat("en", {
      hour: "numeric",
      minute: "2-digit",
    });
    const startTime = time.format(start);
    const endTime = time.format(end);
    if (startDay === endDay) {
      const startShort = startTime.replace(/ (AM|PM)$/, "");
      const sharedMeridiem = startTime.slice(-2) === endTime.slice(-2);
      return `${startDay} · ${sharedMeridiem ? startShort : startTime}–${endTime}`;
    }
    return `${startDay} ${startTime}–${endDay} ${endTime}`;
  }
  return startDay === endDay ? startDay : `${startDay}–${endDay}`;
}

export function ActivityChart({
  values,
  periods,
  range,
  activityLabel,
}: {
  values: number[];
  periods: Period[];
  range: OverviewRange;
  activityLabel: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const buttons = useRef<HTMLButtonElement[]>([]);
  const active = hovered ?? focused;
  const peak = Math.max(...values, 0);
  const detail =
    active !== null && periods[active]
      ? {
          count: `${values[active].toLocaleString()} · ${activityLabel}`,
          time: periodLabel(periods[active], range),
        }
      : null;

  return (
    <div className="relative" onPointerLeave={() => setHovered(null)}>
      <div aria-hidden="true" className="flex h-10 items-end gap-1">
        {values.map((value, index) => {
          const ratio = peak > 0 ? value / peak : 0;
          const ramp = 0.35 + (index / Math.max(values.length - 1, 1)) * 0.65;
          return (
            <span
              key={index}
              className="flex-1 rounded-[2px] bg-current transition-opacity duration-150"
              style={{
                height: value > 0 ? `${Math.max(14, ratio * 100)}%` : "8%",
                opacity:
                  value > 0
                    ? active === null || active === index
                      ? ramp
                      : ramp * 0.45
                    : 0.14,
              }}
            />
          );
        })}
      </div>
      <div
        className="absolute inset-0 grid"
        style={{
          gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))`,
        }}
      >
        {values.map((count, index) => (
          <button
            key={index}
            type="button"
            ref={(element) => {
              if (element) buttons.current[index] = element;
            }}
            tabIndex={index === 0 ? 0 : -1}
            aria-label={`${count.toLocaleString()} ${activityLabel}, ${periodLabel(periods[index], range)}`}
            onPointerEnter={() => setHovered(index)}
            onFocus={() => setFocused(index)}
            onBlur={() => setFocused(null)}
            onKeyDown={(event) => {
              const next =
                event.key === "ArrowRight"
                  ? Math.min(index + 1, values.length - 1)
                  : event.key === "ArrowLeft"
                    ? Math.max(index - 1, 0)
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? values.length - 1
                        : null;
              if (next === null) return;
              event.preventDefault();
              buttons.current[next]?.focus();
            }}
            className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        ))}
      </div>
      {detail && (
        <div
          role="status"
          className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-card px-2.5 py-1.5 text-[11px] leading-4 text-foreground shadow-md"
        >
          <span className="block font-semibold">{detail.count}</span>
          <span className="block text-muted-foreground">{detail.time}</span>
        </div>
      )}
    </div>
  );
}
