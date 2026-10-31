import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api";
import { matchSummarySchema } from "@/lib/match-grade";
import { overviewRangeSchema, overviewWindow } from "@/lib/overview-range";

export const OVERVIEW_TREND_BUCKETS = 12;

export async function getOverviewSummary(
  supabase: SupabaseClient,
  agencyId: string,
  range: unknown,
  now = new Date(),
) {
  const window = overviewWindow(overviewRangeSchema.parse(range), now);
  let jobs = supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("agency_id", agencyId)
    .eq("status", "open");
  let applications = supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("agency_id", agencyId)
    .eq("status", "in_review");
  let intake = supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("agency_id", agencyId);
  let shortlisted = supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("agency_id", agencyId)
    .eq("status", "shortlisted");
  if (window) {
    jobs = jobs.gte("created_at", window.since).lte("created_at", window.until);
    applications = applications
      .gte("submitted_at", window.since)
      .lte("submitted_at", window.until);
    intake = intake
      .gte("submitted_at", window.since)
      .lte("submitted_at", window.until);
    shortlisted = shortlisted
      .gte("submitted_at", window.since)
      .lte("submitted_at", window.until);
  }
  const results = await Promise.all([jobs, applications, shortlisted, intake]);
  if (results.some((result) => result.error))
    throw new ApiError(
      500,
      "OVERVIEW_LOAD_FAILED",
      "The workspace summary could not be loaded.",
    );
  return {
    openJobs: results[0].count ?? 0,
    inReview: results[1].count ?? 0,
    shortlisted: results[2].count ?? 0,
    applicationsReceived: results[3].count ?? 0,
  };
}

export async function getOverviewTrends(
  supabase: SupabaseClient,
  agencyId: string,
  range: unknown,
  now = new Date(),
) {
  const selectedRange = overviewRangeSchema.parse(range);
  const window = overviewWindow(selectedRange, now);
  const end = now.getTime();
  let start = window ? Date.parse(window.since) : end - 86400000;
  if (!window) {
    const [firstJob, firstApplication] = await Promise.all([
      supabase
        .from("jobs")
        .select("created_at")
        .eq("agency_id", agencyId)
        .eq("status", "open")
        .order("created_at", { ascending: true })
        .limit(1),
      supabase
        .from("applications")
        .select("submitted_at")
        .eq("agency_id", agencyId)
        .order("submitted_at", { ascending: true })
        .limit(1),
    ]);
    if (firstJob.error || firstApplication.error)
      throw new ApiError(
        500,
        "OVERVIEW_LOAD_FAILED",
        "The workspace activity could not be loaded.",
      );
    const earliest = [
      firstJob.data?.[0]?.created_at,
      firstApplication.data?.[0]?.submitted_at,
    ]
      .filter((value): value is string => Boolean(value))
      .map(Date.parse)
      .filter(Number.isFinite);
    if (earliest.length) start = Math.min(...earliest, start);
  }
  const periods = Array.from(
    { length: OVERVIEW_TREND_BUCKETS },
    (_, index) => ({
      since: new Date(
        start + ((end - start) * index) / OVERVIEW_TREND_BUCKETS,
      ).toISOString(),
      until: new Date(
        start + ((end - start) * (index + 1)) / OVERVIEW_TREND_BUCKETS,
      ).toISOString(),
    }),
  );
  const series = [
    { key: "openJobs", table: "jobs", date: "created_at", status: "open" },
    {
      key: "applicationsReceived",
      table: "applications",
      date: "submitted_at",
      status: null,
    },
    {
      key: "inReview",
      table: "applications",
      date: "submitted_at",
      status: "in_review",
    },
    {
      key: "shortlisted",
      table: "applications",
      date: "submitted_at",
      status: "shortlisted",
    },
  ] as const;
  const resultsPromise = Promise.all(
    series.flatMap(({ table, date, status }) =>
      periods.map(({ since, until }, index) => {
        let query = supabase
          .from(table)
          .select("id", { count: "exact", head: true })
          .eq("agency_id", agencyId)
          .gte(date, since);
        const isLastBucket = index === OVERVIEW_TREND_BUCKETS - 1;
        query =
          isLastBucket && !window
            ? query
            : isLastBucket
              ? query.lte(date, until)
              : query.lt(date, until);
        if (status) query = query.eq("status", status);
        return query;
      }),
    ),
  );
  const previousStart = new Date(
    window ? start - (end - start) : end - 30 * 86400000,
  ).toISOString();
  const previousEnd = window?.since ?? now.toISOString();
  const previousPromise = Promise.all(
    series.map(({ table, date, status }) => {
      let query = supabase
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("agency_id", agencyId)
        .gte(date, previousStart);
      query = window
        ? query.lt(date, previousEnd)
        : query.lte(date, previousEnd);
      if (status) query = query.eq("status", status);
      return query;
    }),
  );
  const [results, previous] = await Promise.all([
    resultsPromise,
    previousPromise,
  ]);
  if ([...results, ...previous].some((result) => result.error))
    throw new ApiError(
      500,
      "OVERVIEW_LOAD_FAILED",
      "The workspace activity could not be loaded.",
    );
  const bucket = (seriesIndex: number) =>
    results
      .slice(
        seriesIndex * OVERVIEW_TREND_BUCKETS,
        (seriesIndex + 1) * OVERVIEW_TREND_BUCKETS,
      )
      .map((result) => result.count ?? 0);
  return {
    periods,
    periodLabel: selectedRange === "all" ? "All time" : null,
    comparisonLabel:
      selectedRange === "24h"
        ? "previous 24h"
        : selectedRange === "all"
          ? "last 30 days"
          : `previous ${selectedRange.slice(0, -1)} days`,
    previous: {
      openJobs: previous[0].count ?? 0,
      applicationsReceived: previous[1].count ?? 0,
      inReview: previous[2].count ?? 0,
      shortlisted: previous[3].count ?? 0,
    },
    openJobs: bucket(0),
    applicationsReceived: bucket(1),
    inReview: bucket(2),
    shortlisted: bucket(3),
  };
}

export async function getWorkspaceOverview(
  supabase: SupabaseClient,
  agencyId: string,
  range: unknown = "30d",
  now = new Date(),
) {
  const selectedRange = overviewRangeSchema.parse(range);
  const [
    jobs,
    applications,
    requests,
    organizations,
    recentApplications,
    recentRequests,
    intake,
    inReview,
    shortlisted,
  ] = await Promise.all([
    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agencyId)
      .eq("status", "open"),
    supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agencyId)
      .in("status", ["received", "in_review"]),
    supabase
      .from("hiring_requests")
      .select("id,jobs!jobs_agency_id_hiring_request_id_fkey(id)", {
        count: "exact",
        head: true,
      })
      .eq("agency_id", agencyId)
      .in("status", ["submitted", "under_review", "approved"])
      .is("jobs", null),
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agencyId)
      .eq("status", "active"),
    supabase
      .from("applications")
      .select(
        "id,status,processing_status,submitted_at,candidates(full_name),jobs(id,title,clients(name,company_profile))",
      )
      .eq("agency_id", agencyId)
      .in("status", ["received", "in_review"])
      .order("submitted_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(5),
    supabase
      .from("hiring_requests")
      .select(
        "id,title,status,positions_required,created_at,clients(name),jobs!jobs_agency_id_hiring_request_id_fkey(id)",
      )
      .eq("agency_id", agencyId)
      .in("status", ["submitted", "under_review", "approved"])
      .is("jobs", null)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(5),
    supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agencyId),
    supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agencyId)
      .eq("status", "in_review"),
    supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agencyId)
      .eq("status", "shortlisted"),
  ]);
  const error = [
    jobs,
    applications,
    requests,
    organizations,
    recentApplications,
    recentRequests,
    intake,
    inReview,
    shortlisted,
  ].find((result) => result.error)?.error;
  if (error)
    throw new ApiError(
      500,
      "OVERVIEW_LOAD_FAILED",
      "The workspace overview could not be loaded.",
    );
  // Grades are advisory extras: a failed lookup leaves rows ungraded.
  const matchIds = (recentApplications.data ?? []).map((item) => item.id);
  const { data: matchRows } = matchIds.length
    ? await supabase
        .from("application_matches")
        .select(
          "application_id,band,required_met,required_total,preferred_met,preferred_total",
        )
        .eq("agency_id", agencyId)
        .in("application_id", matchIds)
    : { data: [] };
  const matches = new Map(
    (matchRows ?? []).flatMap((row) => {
      const parsed = matchSummarySchema.safeParse(row);
      return parsed.success ? [[row.application_id, parsed.data] as const] : [];
    }),
  );
  const applicationItems = (recentApplications.data ?? []).map(
    (application) => {
      const candidate = Array.isArray(application.candidates)
        ? (application.candidates[0] ?? null)
        : application.candidates;
      const rawJob = Array.isArray(application.jobs)
        ? (application.jobs[0] ?? null)
        : application.jobs;
      const job = rawJob
        ? {
            ...rawJob,
            clients: Array.isArray(rawJob.clients)
              ? (rawJob.clients[0] ?? null)
              : rawJob.clients,
          }
        : null;
      return {
        ...application,
        candidates: candidate,
        jobs: job,
        match: matches.get(application.id) ?? null,
      };
    },
  );
  const requestItems = (recentRequests.data ?? []).map((request) => ({
    ...request,
    clients: Array.isArray(request.clients)
      ? (request.clients[0] ?? null)
      : request.clients,
  }));
  const counts = {
    openJobs: jobs.count ?? 0,
    applicationsToReview: applications.count ?? 0,
    activeRequests: requests.count ?? 0,
    organizations: organizations.count ?? 0,
    applicationsReceived: intake.count ?? 0,
    inReview: inReview.count ?? 0,
    shortlisted: shortlisted.count ?? 0,
  };
  return {
    counts,
    summaryCounts:
      selectedRange === "all"
        ? counts
        : await getOverviewSummary(supabase, agencyId, selectedRange, now),
    applications: applicationItems,
    requests: requestItems,
  };
}

export async function getOverviewJobs(
  supabase: SupabaseClient,
  agencyId: string,
) {
  const fields =
    "id,title,status,positions_required,employment_type,location,deadline_at,published_at,accepting_applications,public_slug,clients(name,company_profile),applications(count)";
  const [all, published, active, drafts, shareable] = await Promise.all([
    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agencyId),
    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agencyId)
      .not("published_at", "is", null),
    supabase
      .from("jobs")
      .select(fields)
      .eq("agency_id", agencyId)
      .eq("status", "open")
      .order("updated_at", { ascending: false })
      .order("id")
      .limit(5),
    supabase
      .from("jobs")
      .select("id,title")
      .eq("agency_id", agencyId)
      .eq("status", "draft")
      .order("updated_at", { ascending: false })
      .order("id")
      .limit(1),
    supabase
      .from("jobs")
      .select("id,title,public_slug")
      .eq("agency_id", agencyId)
      .eq("status", "open")
      .eq("accepting_applications", true)
      .not("published_at", "is", null)
      .not("public_slug", "is", null)
      .order("updated_at", { ascending: false })
      .order("id")
      .limit(1),
  ]);
  if (
    [all, published, active, drafts, shareable].some((result) => result.error)
  )
    throw new ApiError(
      500,
      "OVERVIEW_LOAD_FAILED",
      "The job overview could not be loaded.",
    );
  return {
    totalJobs: all.count ?? 0,
    publishedJobs: published.count ?? 0,
    activeJobs: (active.data ?? []).map((job) => ({
      ...job,
      clients: Array.isArray(job.clients)
        ? (job.clients[0] ?? null)
        : job.clients,
    })),
    draft: drafts.data?.[0] ?? null,
    shareable: shareable.data?.[0] ?? null,
  };
}
