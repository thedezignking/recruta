import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getJobReviewProgress, getJobsActivity } from "./jobs";

const now = new Date("2026-10-27T12:00:00Z");

const jobs = [
  {
    id: "current-open",
    agency_id: "agency",
    status: "open",
    created_at: "2026-10-26T12:00:00Z",
    positions_required: 2,
    deadline_at: "2026-10-30T12:00:00Z",
  },
  {
    id: "current-filled",
    agency_id: "agency",
    status: "filled",
    created_at: "2026-10-25T12:00:00Z",
    positions_required: 1,
    deadline_at: null,
  },
  {
    id: "previous-open",
    agency_id: "agency",
    status: "open",
    created_at: "2026-10-15T12:00:00Z",
    positions_required: 3,
    deadline_at: null,
  },
  {
    id: "other-agency",
    agency_id: "other",
    status: "open",
    created_at: "2026-10-26T12:00:00Z",
    positions_required: 8,
    deadline_at: null,
  },
];

const applications = [
  { id: "a", agency_id: "agency", job_id: "current-open", status: "received" },
  { id: "b", agency_id: "agency", job_id: "current-open", status: "in_review" },
  { id: "c", agency_id: "agency", job_id: "current-open", status: "withdrawn" },
  {
    id: "d",
    agency_id: "agency",
    job_id: "previous-open",
    status: "shortlisted",
  },
  { id: "e", agency_id: "other", job_id: "current-open", status: "in_review" },
];

function database() {
  return {
    from: vi.fn((table: string) => {
      let rows: Record<string, unknown>[] = [
        ...(table === "jobs" ? jobs : applications),
      ];
      const query = {
        select: () => query,
        eq: (key: string, value: string) => {
          rows = rows.filter((row) => row[key] === value);
          return query;
        },
        in: (key: string, values: string[]) => {
          rows = rows.filter((row) => values.includes(String(row[key])));
          return query;
        },
        gte: (key: string, value: string) => {
          rows = rows.filter((row) => String(row[key]) >= value);
          return query;
        },
        lte: (key: string, value: string) => {
          rows = rows.filter((row) => String(row[key]) <= value);
          return query;
        },
        order: (key: string, options: { ascending: boolean }) => {
          rows.sort((a, b) =>
            options.ascending
              ? String(a[key]).localeCompare(String(b[key]))
              : String(b[key]).localeCompare(String(a[key])),
          );
          return query;
        },
        limit: (count: number) => {
          rows = rows.slice(0, count);
          return query;
        },
        range: (from: number, to: number) =>
          Promise.resolve({ data: rows.slice(from, to + 1), error: null }),
        then: (resolve: (result: unknown) => unknown) =>
          Promise.resolve(resolve({ data: rows, error: null })),
      };
      return query;
    }),
  } as unknown as SupabaseClient;
}

describe("jobs activity", () => {
  it("uses the selected intake window, current job status, and tenant for every chart", async () => {
    const result = await getJobsActivity(database(), "agency", "7d", now);
    expect(result.counts).toEqual({
      open: 1,
      positions: 2,
      nearDeadline: 1,
      filled: 1,
    });
    expect(result.previous).toEqual({
      open: 1,
      positions: 3,
      nearDeadline: 0,
      filled: 0,
    });
    expect(result.series.positions.reduce((sum, count) => sum + count, 0)).toBe(
      2,
    );
  });

  it("counts review progress only for the requested agency and jobs", async () => {
    const progress = await getJobReviewProgress(database(), "agency", [
      "current-open",
      "previous-open",
    ]);
    expect(Object.fromEntries(progress)).toEqual({
      "current-open": 1,
      "previous-open": 1,
    });
  });
});
