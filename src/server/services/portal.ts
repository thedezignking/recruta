import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api";
import { decodeTimeCursor } from "@/lib/cursor";
export async function listPortalJobs(
  db: SupabaseClient,
  clientId: string,
  cursor?: string,
) {
  let q = db
    .from("jobs")
    .select("id,title,status,positions_required,location,created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(26);
  if (cursor) {
    const p = decodeTimeCursor(cursor)!;
    q = q.or(`created_at.lt.${p.at},and(created_at.eq.${p.at},id.lt.${p.id})`);
  }
  const { data, error } = await q;
  if (error)
    throw new ApiError(
      503,
      "PORTAL_JOBS_UNAVAILABLE",
      "Jobs could not be loaded.",
    );
  const items = (data ?? []).slice(0, 25);
  const last = items.at(-1);
  return {
    items,
    nextCursor:
      data && data.length > 25 && last
        ? Buffer.from(
            JSON.stringify({ at: last.created_at, id: last.id }),
          ).toString("base64url")
        : null,
  };
}
export async function getPortalJob(
  db: SupabaseClient,
  clientId: string,
  jobId: string,
) {
  const { data, error } = await db
    .from("jobs")
    .select(
      "id,title,description,status,positions_required,location,department,work_arrangement,job_requirements(id,label,description,requirement_type)",
    )
    .eq("client_id", clientId)
    .eq("id", jobId)
    .maybeSingle();
  if (error)
    throw new ApiError(
      503,
      "PORTAL_JOB_UNAVAILABLE",
      "Job could not be loaded.",
    );
  if (!data) throw new ApiError(404, "JOB_NOT_FOUND", "Job not found.");
  return data;
}
