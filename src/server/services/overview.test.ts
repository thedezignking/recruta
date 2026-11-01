import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getOverviewSummary,
  getWorkspaceOverview,
  getOverviewJobs,
  getOverviewTrends,
  OVERVIEW_TREND_BUCKETS,
} from "./overview";

const now = new Date("2026-10-25T12:00:00Z");
const recent = "2026-10-24T12:00:00Z";
const old = "2026-09-01T12:00:00Z";
type Row = {
  id: string;
  agency_id: string;
  status: string;
  created_at: string;
  submitted_at: string;
  jobs?: { id: string }[];
  published_at?: string | null;
  accepting_applications?: boolean;
  public_slug?: string | null;
};
function row(
  id: string,
  status: string,
  at = recent,
  agency_id = "agency",
): Row {
  return { id, status, agency_id, created_at: at, submitted_at: at };
}
function database(error = false) {
  const data: Record<string, Row[]> = {
    jobs: [
      {
        ...row("open", "open"),
        published_at: recent,
        accepting_applications: true,
        public_slug: "open",
      },
      {
        ...row("old-open", "open", old),
        published_at: old,
        accepting_applications: true,
        public_slug: "old-open",
      },
      row("draft", "draft"),
      row("other", "open", recent, "other"),
    ],
    applications: [
      row("new", "received"),
      row("review", "in_review"),
      row("old-review", "in_review", old),
      row("shortlist", "shortlisted"),
      row("future", "received", "2026-10-26T12:00:00Z"),
      row("other", "in_review", recent, "other"),
    ],
    hiring_requests: [
      row("active", "submitted"),
      row("old-request", "under_review", old),
      row("draft", "draft"),
      row("waiting-client", "clarification_requested"),
      { ...row("converted", "approved"), jobs: [{ id: "converted-job" }] },
    ],
    clients: [],
    application_matches: [],
    placements: [
      row("placed", "pending_start"),
      row("fell", "fell_through"),
      row("old-placed", "started", old),
    ],
  };
  return {
    from: vi.fn((table: string) => {
      let rows = [...data[table]];
      let head = false;
      const query = {
        select: (_: string, options?: { head?: boolean }) => {
          head = options?.head ?? false;
          return query;
        },
        eq: (key: keyof Row, value: string) => {
          rows = rows.filter((item) => item[key] === value);
          return query;
        },
        neq: (key: keyof Row, value: string) => {
          rows = rows.filter((item) => item[key] !== value);
          return query;
        },
        in: (key: "status", values: string[]) => {
          rows = rows.filter((item) => values.includes(item[key]));
          return query;
        },
        is: (key: "jobs") => {
          rows = rows.filter((item) => !item[key]?.length);
          return query;
        },
        not: (key: keyof Row) => {
          rows = rows.filter((item) => item[key] != null);
          return query;
        },
        gte: (key: "created_at" | "submitted_at", value: string) => {
          rows = rows.filter((item) => new Date(item[key]) >= new Date(value));
          return query;
        },
        lte: (key: "created_at" | "submitted_at", value: string) => {
          rows = rows.filter((item) => new Date(item[key]) <= new Date(value));
          return query;
        },
        lt: (key: "created_at" | "submitted_at", value: string) => {
          rows = rows.filter((item) => new Date(item[key]) < new Date(value));
          return query;
        },
        order: (key: "created_at" | "submitted_at") => {
          rows.sort(
            (left, right) => Date.parse(left[key]) - Date.parse(right[key]),
          );
          return query;
        },
        limit: (limit: number) => {
          rows = rows.slice(0, limit);
          return query;
        },
        then: (resolve: (result: unknown) => unknown) =>
          Promise.resolve(
            resolve({
              count: rows.length,
              data: head ? null : rows,
              error: error ? { message: "unavailable" } : null,
            }),
          ),
      };
      return query;
    }),
  } as unknown as SupabaseClient;
}

describe("overview summary", () => {
  it("loads current jobs independently of the recent list and summary period", async () => {
    const result = await getOverviewJobs(database(), "agency");
    expect(result.totalJobs).toBe(3);
    expect(result.publishedJobs).toBe(2);
    expect(result.activeJobs.map((job) => job.id)).toEqual([
      "open",
      "old-open",
    ]);
    expect(result.draft?.id).toBe("draft");
    expect(result.shareable?.id).toBe("open");
    await expect(
      getOverviewJobs(database(true), "agency"),
    ).rejects.toMatchObject({ code: "OVERVIEW_LOAD_FAILED" });
  });
  it("filters intake dates, current state and tenant without mixing new arrivals into In review", async () => {
    expect(await getOverviewSummary(database(), "agency", "7d", now)).toEqual({
      openJobs: 1,
      inReview: 1,
      shortlisted: 1,
      applicationsReceived: 3,
      placements: 1,
    });
  });
  it("supports unbounded all-time counts", async () => {
    expect(await getOverviewSummary(database(), "agency", "all", now)).toEqual({
      openJobs: 2,
      inReview: 2,
      shortlisted: 1,
      applicationsReceived: 5,
      placements: 2,
    });
  });
  it("includes the full intake history in All-time charts", async () => {
    const trends = await getOverviewTrends(database(), "agency", "all", now);
    expect(OVERVIEW_TREND_BUCKETS).toBe(12);
    expect(trends.periods).toHaveLength(OVERVIEW_TREND_BUCKETS);
    expect(trends.openJobs).toHaveLength(OVERVIEW_TREND_BUCKETS);
    expect(trends.periodLabel).toBe("All time");
    expect(trends.openJobs.reduce((sum, value) => sum + value, 0)).toBe(2);
    expect(
      trends.applicationsReceived.reduce((sum, value) => sum + value, 0),
    ).toBe(5);
    expect(trends.inReview.reduce((sum, value) => sum + value, 0)).toBe(2);
    expect(trends.shortlisted.reduce((sum, value) => sum + value, 0)).toBe(1);
    // Fell-through placements are excluded.
    expect(trends.placements.reduce((sum, value) => sum + value, 0)).toBe(2);
    expect(trends.previous).toEqual({
      openJobs: 1,
      applicationsReceived: 3,
      inReview: 1,
      shortlisted: 1,
      placements: 1,
    });
    expect(trends.comparisonLabel).toBe("last 30 days");
    await expect(
      getOverviewTrends(database(true), "agency", "7d", now),
    ).rejects.toMatchObject({ code: "OVERVIEW_LOAD_FAILED" });
  });
  it("keeps older outstanding work in the queues when summaries are filtered", async () => {
    const result = await getWorkspaceOverview(database(), "agency", "7d", now);
    expect(result.summaryCounts.inReview).toBe(1);
    expect(result.counts.applicationsToReview).toBe(4);
    expect(result.applications.some((item) => item.id === "old-review")).toBe(
      true,
    );
    expect(result.requests.some((item) => item.id === "old-request")).toBe(
      true,
    );
    expect(result.applications.some((item) => item.id === "shortlist")).toBe(
      false,
    );
    expect(
      result.requests.some(
        (item) => item.id === "converted" || item.id === "waiting-client",
      ),
    ).toBe(false);
  });
  it("rejects unsupported service inputs and propagates count errors", async () => {
    await expect(
      getOverviewSummary(database(), "agency", "year", now),
    ).rejects.toThrow();
    await expect(
      getOverviewSummary(database(true), "agency", "7d", now),
    ).rejects.toMatchObject({ code: "OVERVIEW_LOAD_FAILED" });
  });
});
