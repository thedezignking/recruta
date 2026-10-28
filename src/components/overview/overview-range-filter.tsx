"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { overviewRanges, type OverviewRange } from "@/lib/overview-range";

const labels: Record<OverviewRange, string> = {
  "24h": "24h",
  "7d": "7d",
  "14d": "14d",
  "30d": "30d",
  all: "All",
};
const accessibleLabels: Record<OverviewRange, string> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "14d": "Last 14 days",
  "30d": "Last 30 days",
  all: "All time",
};

export function OverviewRangeFilter({
  value,
  path = "/app",
}: {
  value: OverviewRange;
  path?: string;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const [pending, startTransition] = useTransition();
  function selectRange(next: OverviewRange) {
    if (next === value) return;
    const params = new URLSearchParams(search.toString());
    if (next === "30d") params.delete("range");
    else params.set("range", next);
    startTransition(() =>
      router.replace(`${path}${params.size ? `?${params}` : ""}`, {
        scroll: false,
      }),
    );
  }
  return (
    <div className="min-w-0">
      <span role="status" className="sr-only">
        {pending ? "Updating summary…" : ""}
      </span>
      <div
        role="group"
        aria-label="Summary date range"
        className="inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full bg-[#efefef] p-0.5"
      >
        {overviewRanges.map(({ value: option }) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            aria-label={accessibleLabels[option]}
            disabled={pending}
            onClick={() => selectRange(option)}
            className="h-6 shrink-0 rounded-full px-2.5 text-[11px] font-medium whitespace-nowrap text-[#666666] outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-white aria-pressed:font-semibold aria-pressed:text-[#111111] aria-pressed:shadow-[0_1px_3px_rgb(0_0_0_/_0.1)]"
          >
            {labels[option]}
          </button>
        ))}
      </div>
    </div>
  );
}
