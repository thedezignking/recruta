import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api";

export async function getWorkspaceOverview(
  supabase: SupabaseClient,
  agencyId: string,
) {
  const [
    jobs,
    applications,
    requests,
    organizations,
    recentApplications,
    recentRequests,
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
  ]);
  const error = [
    jobs,
    applications,
    requests,
    organizations,
    recentApplications,
    recentRequests,
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
  return {
    counts: {
      openJobs: jobs.count ?? 0,
      applicationsToReview: applications.count ?? 0,
      activeRequests: requests.count ?? 0,
      organizations: organizations.count ?? 0,
    },
    applications: applicationItems,
    requests: requestItems,
  };
}
