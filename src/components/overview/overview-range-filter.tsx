"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { overviewRanges, type OverviewRange } from "@/lib/overview-range";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
      <Select
        value={value}
        onValueChange={(next) => selectRange(next as OverviewRange)}
        disabled={pending}
      >
        <SelectTrigger
          aria-label="Summary date range"
          className="h-9 w-fit rounded-md px-3 text-[12px] font-medium text-[#111111] transition-[transform,background-color,border-color] duration-150 ease-out hover:bg-black/[0.02] active:scale-[0.98]"
        >
          {/* Reserve the width of the widest label so the trigger hugs it
              without shifting as the selection changes. */}
          <span className="grid">
            {overviewRanges.map(({ value: option }) => (
              <span
                key={option}
                aria-hidden="true"
                className="invisible col-start-1 row-start-1"
              >
                {accessibleLabels[option]}
              </span>
            ))}
            <SelectValue className="col-start-1 row-start-1">
              {(current: unknown) => accessibleLabels[current as OverviewRange]}
            </SelectValue>
          </span>
        </SelectTrigger>
        <SelectContent
          align="end"
          sideOffset={6}
          alignItemWithTrigger={false}
          className="w-[168px] origin-(--transform-origin) p-1 duration-200 ease-out"
        >
          {overviewRanges.map(({ value: option }) => (
            <SelectItem
              key={option}
              value={option}
              className="rounded-[6px] py-1.5 text-[12px] font-medium"
            >
              {accessibleLabels[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
