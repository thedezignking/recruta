import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api";
import type { WorkspaceNotification } from "@/lib/notifications";

export async function listNotifications(
  supabase: SupabaseClient,
  agencyId: string,
  userId: string,
) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [applications, requests, assignments] = await Promise.all([
    supabase
      .from("applications")
      .select(
        "id,candidate_id,job_id,submitted_at,candidates(full_name),jobs(title)",
      )
      .eq("agency_id", agencyId)
      .gte("submitted_at", since)
      .order("submitted_at", { ascending: false })
      .order("id")
      .limit(8),
    supabase
      .from("hiring_requests")
      .select("id,title,status,updated_at")
      .eq("agency_id", agencyId)
      .neq("status", "draft")
      .gte("updated_at", since)
      .order("updated_at", { ascending: false })
      .order("id")
      .limit(8),
    supabase
      .from("job_assignments")
      .select("id,job_id,created_at,jobs(title)")
      .eq("agency_id", agencyId)
      .eq("user_id", userId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .order("id")
      .limit(8),
  ]);
  if (applications.error || requests.error || assignments.error)
    throw new ApiError(
      503,
      "NOTIFICATIONS_UNAVAILABLE",
      "Notifications could not be loaded. Try again.",
    );
  // Supabase joins may be arrays or objects depending on generated relationship shape.
  function related(value: unknown, field: string): string {
    const row = Array.isArray(value) ? value[0] : value;
    return row && typeof row === "object" && typeof row[field] === "string"
      ? row[field]
      : "";
  }
  const items: WorkspaceNotification[] = [
    ...(applications.data ?? []).map((item) => ({
      id: `application:${item.id}`,
      kind: "application" as const,
      title: "New application",
      detail: [
        related(item.candidates, "full_name"),
        related(item.jobs, "title"),
      ]
        .filter(Boolean)
        .join(" · "),
      href: `/app/applications/${item.id}`,
      occurredAt: item.submitted_at,
    })),
    ...(requests.data ?? []).map((item) => ({
      id: `request:${item.id}:${item.updated_at}`,
      kind: "request" as const,
      title: "Hiring request updated",
      detail: `${item.title} · ${item.status.replaceAll("_", " ")}`,
      href: `/app/requests/${item.id}`,
      occurredAt: item.updated_at,
    })),
    ...(assignments.data ?? [])
      .filter((item) => related(item.jobs, "title"))
      .map((item) => ({
        id: `assignment:${item.id}`,
        kind: "assignment" as const,
        title: "Job assigned to you",
        detail: related(item.jobs, "title"),
        href: `/app/jobs/${item.job_id}`,
        occurredAt: item.created_at,
      })),
  ];
  return {
    items: items
      .sort(
        (a, b) =>
          b.occurredAt.localeCompare(a.occurredAt) || a.id.localeCompare(b.id),
      )
      .slice(0, 15),
  };
}
