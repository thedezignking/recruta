"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { overviewRanges, type OverviewRange } from "@/lib/overview-range";

export function OverviewRangeFilter({ value }: { value: OverviewRange }) {
  const router = useRouter();
  const search = useSearchParams();
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span role="status" className="sr-only">
        {pending ? "Updating summary…" : ""}
      </span>
      <Select
        value={value}
        disabled={pending}
        items={overviewRanges.map((range) => ({
          value: range.value,
          label:
            range.value === "all"
              ? "All time"
              : range.value === "24h"
                ? "Last 24 hours"
                : `Last ${range.value.slice(0, -1)} days`,
        }))}
        onValueChange={(next) => {
          if (!next || next === value) return;
          const params = new URLSearchParams(search.toString());
          if (next === "30d") params.delete("range");
          else params.set("range", next);
          startTransition(() =>
            router.replace(`/app${params.size ? `?${params}` : ""}`, {
              scroll: false,
            }),
          );
        }}
      >
        <SelectTrigger
          aria-label="Summary date range"
          className="gap-2 data-[size=default]:h-9"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end" alignItemWithTrigger={false}>
          <SelectGroup>
            {overviewRanges.map((range) => (
              <SelectItem key={range.value} value={range.value}>
                {range.value === "all"
                  ? "All time"
                  : range.value === "24h"
                    ? "Last 24 hours"
                    : `Last ${range.value.slice(0, -1)} days`}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
