import "server-only";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api";
import { resendInvitation } from "./invitations";
import {
  collaborationError,
  collaboratorSchema,
  feedbackSchema,
  shareCandidateSchema,
} from "@/lib/collaboration";

export async function shareCandidate(
  db: SupabaseClient,
  agencyId: string,
  applicationId: string,
  input: unknown,
  requestId: string,
) {
  const payload = shareCandidateSchema.parse(input);
  const { data, error } = await db.rpc("share_candidate", {
    p_agency_id: agencyId,
    p_application_id: applicationId,
    p_summary: payload.action === "share" ? payload.summary : "",
    p_withdraw: payload.action === "withdraw",
    p_request_id: requestId,
    p_document_id: payload.action === "share" ? payload.documentId : null,
    p_expected_submission_id:
      payload.action === "withdraw" ? payload.submissionId : null,
  });
  if (error) throw new ApiError(...collaborationError(error.message));
  return { submissionId: data };
}
export async function resendJobInvitation(
  db: SupabaseClient,
  agencyId: string,
  jobId: string,
  invitationId: string,
) {
  const access = await db.rpc("job_collaborator_directory", {
    p_agency_id: agencyId,
    p_job_id: jobId,
  });
  if (access.error)
    throw new ApiError(
      403,
      "JOB_ACCESS_DENIED",
      "You cannot resend this invitation.",
    );
  const invite = await db
    .from("client_invitations")
    .select("id")
    .eq("agency_id", agencyId)
    .eq("job_id", jobId)
    .eq("id", invitationId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .maybeSingle();
  if (invite.error || !invite.data)
    throw new ApiError(
      404,
      "INVITATION_NOT_FOUND",
      "This invitation is no longer active.",
    );
  const delivery = await db
    .from("communications")
    .select("id")
    .eq("agency_id", agencyId)
    .eq("message_type", "client_invitation")
    .eq("related_entity_id", invitationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (delivery.error || !delivery.data)
    throw new ApiError(
      409,
      "DELIVERY_NOT_FOUND",
      "Revoke this invitation and invite the person again to create a new delivery.",
    );
  return { delivery: await resendInvitation(db, agencyId, delivery.data.id) };
}
export async function manageCollaborator(
  db: SupabaseClient,
  agencyId: string,
  jobId: string,
  input: unknown,
  requestId: string,
) {
  const payload = collaboratorSchema.parse(input);
  const { error } = await db.rpc("manage_job_collaborator", {
    p_agency_id: agencyId,
    p_job_id: jobId,
    p_user_id: payload.userId,
    p_action: payload.action,
    p_request_id: requestId,
  });
  if (error) throw new ApiError(...collaborationError(error.message));
  return { updated: true };
}
export async function submitFeedback(
  db: SupabaseClient,
  submissionId: string,
  input: unknown,
  requestId: string,
) {
  const payload = feedbackSchema.parse(input);
  const { data, error } = await db.rpc("submit_candidate_feedback", {
    p_submission_id: submissionId,
    p_feedback_id: payload.feedbackId,
    p_payload: payload,
    p_request_id: requestId,
  });
  if (error) throw new ApiError(...collaborationError(error.message));
  return { feedbackId: data };
}
export async function getSubmissions(
  db: SupabaseClient,
  scope: { agencyId: string; jobId?: string; applicationId?: string },
) {
  let query = db
    .from("candidate_submissions")
    .select(
      "id,job_id,application_id,document_id,candidate_name,summary,shared_at,withdrawn_at,submission_feedback(id,recommendation,strengths,concerns,comment,created_at)",
    )
    .eq("agency_id", scope.agencyId)
    .order("shared_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(50);
  if (scope.jobId) query = query.eq("job_id", scope.jobId);
  if (scope.applicationId)
    query = query.eq("application_id", scope.applicationId);
  const { data, error } = await query;
  if (error)
    throw new ApiError(
      503,
      "SUBMISSIONS_UNAVAILABLE",
      "Shared candidates could not be loaded.",
    );
  return data ?? [];
}
export async function getJobCollaborators(
  db: SupabaseClient,
  agencyId: string,
  jobId: string,
  clientId: string,
) {
  const [directory, invitations] = await Promise.all([
    db.rpc("job_collaborator_directory", {
      p_agency_id: agencyId,
      p_job_id: jobId,
    }),
    db
      .from("client_invitations")
      .select("id,email,role,expires_at,accepted_at,revoked_at")
      .eq("agency_id", agencyId)
      .eq("client_id", clientId)
      .eq("job_id", jobId)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(25),
  ]);
  if (directory.error || invitations.error)
    throw new ApiError(
      503,
      "COLLABORATORS_UNAVAILABLE",
      "Hiring managers could not be loaded.",
    );
  const members = z
    .array(
      z.object({
        user_id: z.uuid(),
        role: z.string(),
        name: z.string(),
        email: z.string(),
        has_access: z.boolean(),
      }),
    )
    .parse(directory.data ?? []);
  return {
    members: members.map((m) => ({ ...m, hasAccess: m.has_access })),
    invitations: invitations.data ?? [],
  };
}
