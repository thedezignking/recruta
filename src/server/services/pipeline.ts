import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api";
import { pipelineActionSchema } from "@/lib/pipeline";

const errors: Record<string, [number, string, string]> = {
  application_not_found: [
    404,
    "APPLICATION_NOT_FOUND",
    "Application not found or access was removed.",
  ],
  application_changed: [
    409,
    "APPLICATION_CHANGED",
    "Someone updated this application. Refresh before trying again.",
  ],
  pipeline_not_eligible: [
    409,
    "PIPELINE_NOT_ELIGIBLE",
    "This isn't available at the application's current stage.",
  ],
  pipeline_reason_required: [
    422,
    "REASON_REQUIRED",
    "Add a reason of at least five characters.",
  ],
  invalid_interviewer: [
    422,
    "INVALID_INTERVIEWER",
    "Choose active teammates as interviewers.",
  ],
  interview_not_found: [404, "INTERVIEW_NOT_FOUND", "Interview not found."],
  interview_closed: [
    409,
    "INTERVIEW_CLOSED",
    "This interview is already closed. Refresh to see its outcome.",
  ],
  offer_not_found: [404, "OFFER_NOT_FOUND", "Offer not found."],
  offer_closed: [
    409,
    "OFFER_CLOSED",
    "This offer can no longer be changed. Refresh to see its status.",
  ],
  invalid_offer_transition: [
    409,
    "INVALID_OFFER_TRANSITION",
    "That offer change isn't available.",
  ],
  offer_not_accepted: [
    409,
    "OFFER_NOT_ACCEPTED",
    "Record the candidate's acceptance before the placement.",
  ],
  job_openings_filled: [
    409,
    "OPENINGS_FILLED",
    "Every opening on this job already has a placement.",
  ],
  placement_not_found: [404, "PLACEMENT_NOT_FOUND", "Placement not found."],
  invalid_placement_transition: [
    409,
    "INVALID_PLACEMENT_TRANSITION",
    "That placement change isn't available.",
  ],
  permission_denied: [
    403,
    "PERMISSION_DENIED",
    "Only owners and administrators can record fees.",
  ],
  idempotency_conflict: [
    409,
    "IDEMPOTENCY_CONFLICT",
    "This request was already used for something else. Refresh and try again.",
  ],
};

export async function managePipeline(
  supabase: SupabaseClient,
  agencyId: string,
  applicationId: string,
  input: unknown,
  requestId: string,
) {
  const payload = pipelineActionSchema.parse(input);
  const { data, error } = await supabase.rpc("manage_pipeline", {
    p_agency_id: agencyId,
    p_application_id: applicationId,
    p_action: payload.action,
    p_payload: payload,
    p_expected_updated_at:
      "expectedUpdatedAt" in payload ? payload.expectedUpdatedAt : null,
    p_request_id: requestId,
  });
  if (error) {
    const detail = errors[error.message];
    if (detail) throw new ApiError(...detail);
    if (error.code === "23505")
      throw new ApiError(
        409,
        "PIPELINE_CONFLICT",
        "This candidate already has a live offer or placement.",
      );
    if (error.code === "23514" || error.code === "22P02")
      throw new ApiError(
        422,
        "PIPELINE_INVALID",
        "Check the details and try again.",
      );
    throw new ApiError(
      500,
      "PIPELINE_UPDATE_FAILED",
      "The change could not be saved.",
    );
  }
  return data as {
    id: string;
    applicationStatus: string;
    applicationUpdatedAt: string;
  };
}

export type ApplicationPipeline = Awaited<
  ReturnType<typeof getApplicationPipeline>
>;

/** Interviews, offers and placements for one application. */
export async function getApplicationPipeline(
  supabase: SupabaseClient,
  agencyId: string,
  applicationId: string,
) {
  const [interviews, offers, placements] = await Promise.all([
    supabase
      .from("interviews")
      .select(
        "id,round,title,starts_at,ends_at,timezone,format,location,interviewer_ids,guests,status,outcome,outcome_note,cancel_reason",
      )
      .eq("agency_id", agencyId)
      .eq("application_id", applicationId)
      .order("starts_at", { ascending: false }),
    supabase
      .from("offers")
      .select(
        "id,status,salary_amount,currency,salary_period,start_date,expires_at,notes,decision_reason,extended_at,decided_at,created_at",
      )
      .eq("agency_id", agencyId)
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false }),
    supabase
      .from("placements")
      .select(
        "id,offer_id,opening_number,start_date,status,fell_through_reason,created_at",
      )
      .eq("agency_id", agencyId)
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false }),
  ]);
  // Before the migration is applied these tables do not exist; show nothing.
  return {
    interviews: interviews.error ? [] : (interviews.data ?? []),
    offers: offers.error ? [] : (offers.data ?? []),
    placements: placements.error ? [] : (placements.data ?? []),
    available: !interviews.error,
  };
}

/** Openings filled on a job: placements that have not fallen through. */
export async function getJobOpenings(
  supabase: SupabaseClient,
  agencyId: string,
  jobId: string,
) {
  const { data, error } = await supabase
    .from("placements")
    .select(
      "id,opening_number,start_date,status,application_id,applications(candidates(full_name))",
    )
    .eq("agency_id", agencyId)
    .eq("job_id", jobId)
    .neq("status", "fell_through")
    .order("opening_number");
  if (error) return null;
  return (data ?? []).map((row) => {
    const application = Array.isArray(row.applications)
      ? row.applications[0]
      : row.applications;
    const candidate = Array.isArray(application?.candidates)
      ? application.candidates[0]
      : application?.candidates;
    return {
      id: row.id,
      opening: row.opening_number,
      startDate: row.start_date,
      status: row.status,
      applicationId: row.application_id,
      candidateName:
        (candidate as { full_name?: string } | null | undefined)?.full_name ??
        "Candidate",
    };
  });
}
