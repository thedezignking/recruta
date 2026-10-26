import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api";
import { overviewRangeSchema, overviewWindow } from "@/lib/overview-range";

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
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agencyId)
      .in("status", [
        "submitted",
        "under_review",
        "clarification_requested",
        "approved",
      ]),
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agencyId)
      .eq("status", "active"),
    supabase
      .from("applications")
      .select(
        "id,status,processing_status,submitted_at,candidates(full_name),jobs(id,title,clients(name))",
      )
      .eq("agency_id", agencyId)
      .order("submitted_at", { ascending: false })
      .limit(5),
    supabase
      .from("hiring_requests")
      .select("id,title,status,positions_required,created_at,clients(name)")
      .eq("agency_id", agencyId)
      .in("status", [
        "submitted",
        "under_review",
        "clarification_requested",
        "approved",
      ])
      .order("updated_at", { ascending: false })
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
      return { ...application, candidates: candidate, jobs: job };
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
