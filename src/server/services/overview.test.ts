import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getOverviewSummary, getWorkspaceOverview } from "./overview";

const now = new Date("2026-10-25T12:00:00Z");
const recent = "2026-10-24T12:00:00Z";
const old = "2026-09-01T12:00:00Z";
type Row = {
  id: string;
  agency_id: string;
  status: string;
  created_at: string;
  submitted_at: string;
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
      row("open", "open"),
      row("old-open", "open", old),
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
    ],
    clients: [],
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
        in: (key: keyof Row, values: string[]) => {
          rows = rows.filter((item) => values.includes(item[key]));
          return query;
        },
        gte: (key: keyof Row, value: string) => {
          rows = rows.filter((item) => new Date(item[key]) >= new Date(value));
          return query;
        },
        lte: (key: keyof Row, value: string) => {
          rows = rows.filter((item) => new Date(item[key]) <= new Date(value));
          return query;
        },
        order: () => query,
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
  it("filters intake dates, current state and tenant without mixing new arrivals into In review", async () => {
    expect(await getOverviewSummary(database(), "agency", "7d", now)).toEqual({
      openJobs: 1,
      inReview: 1,
      shortlisted: 1,
      applicationsReceived: 3,
    });
  });
  it("supports unbounded all-time counts", async () => {
    expect(await getOverviewSummary(database(), "agency", "all", now)).toEqual({
      openJobs: 2,
      inReview: 2,
      shortlisted: 1,
      applicationsReceived: 5,
    });
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
