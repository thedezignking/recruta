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
      <svg
        aria-hidden="true"
        viewBox="0 0 240 48"
        preserveAspectRatio="none"
        className="h-12 w-full"
      >
        {active !== null && (
          <rect
            x={active * 30}
            y={0}
            width={30}
            height={48}
            rx={3}
            className="fill-current opacity-[0.07]"
          />
        )}
        {Array.from({ length: values.length * 3 }, (_, column) => {
          const value = values[Math.floor(column / 3)] ?? 0;
          return Array.from({ length: 6 }, (_, row) => {
            const filled =
              value > 0 && 6 - row <= Math.ceil((value / peak) * 6);
            return (
              <circle
                key={`${column}-${row}`}
                cx={5 + column * 10}
                cy={5 + row * 7.5}
                r="1.75"
                className={
                  filled ? "fill-current" : "fill-current opacity-[0.14]"
                }
              />
            );
          });
        })}
      </svg>
      <div className="absolute inset-0 grid grid-cols-8">
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
