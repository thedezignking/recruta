import { z } from "zod";
export const portalMembershipsSchema = z.array(
  z.object({
    agency_id: z.uuid(),
    client_id: z.uuid(),
    role: z.enum(["client_administrator", "hiring_manager", "reviewer"]),
    client_name: z.string(),
    agency_name: z.string(),
  }),
);

export const shareCandidateSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("share"),
    summary: z.string().trim().min(10).max(5000),
    documentId: z.uuid().nullable().default(null),
  }),
  z.object({ action: z.literal("withdraw"), submissionId: z.uuid() }),
]);
export const collaboratorSchema = z.object({
  userId: z.uuid(),
  action: z.enum(["grant", "revoke"]),
});
export const feedbackSchema = z.object({
  feedbackId: z.uuid(),
  recommendation: z.enum(["proceed", "discuss", "pass"]),
  strengths: z.string().trim().max(3000).default(""),
  concerns: z.string().trim().max(3000).default(""),
  comment: z.string().trim().min(5).max(5000),
});
export const jobInvitationSchema = z.object({
  email: z.email().toLowerCase(),
  role: z.enum(["hiring_manager", "reviewer"]),
});

export function collaborationError(message: string) {
  const errors: Record<string, [number, string, string]> = {
    permission_denied: [
      403,
      "ACCESS_DENIED",
      "Access was removed or this action is not available to your role.",
    ],
    invalid_collaborator: [
      422,
      "INVALID_COLLABORATOR",
      "Choose an active member of this organization.",
    ],
    shortlist_before_sharing: [
      409,
      "SHORTLIST_REQUIRED",
      "Shortlist the application before sharing it.",
    ],
    submission_exists: [
      409,
      "SUBMISSION_EXISTS",
      "This candidate is already shared. Withdraw the submission before creating a new one.",
    ],
    submission_not_found: [
      404,
      "SUBMISSION_NOT_FOUND",
      "This submission is no longer available.",
    ],
    submission_changed: [
      409,
      "SUBMISSION_CHANGED",
      "This submission changed. Refresh before withdrawing it.",
    ],
    idempotency_conflict: [
      409,
      "IDEMPOTENCY_CONFLICT",
      "This request was already used for different feedback. Refresh and try again.",
    ],
  };
  return (
    errors[message] ??
    ([
      409,
      "COLLABORATION_FAILED",
      "The change could not be saved. Refresh and try again.",
    ] as [number, string, string])
  );
}
