import { z } from "zod";

export const overviewRangeSchema = z.enum(["all", "24h", "7d", "14d", "30d"]);
export type OverviewRange = z.infer<typeof overviewRangeSchema>;
export const overviewRanges = [
  { value: "all", label: "All time" },
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "14d", label: "14d" },
  { value: "30d", label: "30d" },
] as const;

export function parseOverviewRange(value: unknown): OverviewRange {
  const parsed = overviewRangeSchema.safeParse(value);
  return parsed.success ? parsed.data : "30d";
}

export function overviewWindow(range: OverviewRange, now: Date) {
  if (range === "all") return null;
  const hours = range === "24h" ? 24 : Number(range.slice(0, -1)) * 24;
  return {
    since: new Date(now.getTime() - hours * 3600000).toISOString(),
    until: now.toISOString(),
  };
}
