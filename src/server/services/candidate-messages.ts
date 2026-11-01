import "server-only";
import { Resend } from "resend";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api";
import { candidateMessageSchema } from "@/lib/applicant-processing";
import { getDeliveryEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { candidateEmail } from "@/server/email/templates";
import { getApplication } from "./applications";

export async function listCandidateMessages(
  db: SupabaseClient,
  agencyId: string,
  applicationId: string,
) {
  await getApplication(db, agencyId, applicationId);
  const { data, error } = await db
    .from("communications")
    .select(
      "id,message_type,subject,body,recipient_email,reply_to,status,attempt_count,failure_code,created_at,sent_at,delivered_at",
    )
    .eq("agency_id", agencyId)
    .eq("related_entity_type", "application")
    .eq("related_entity_id", applicationId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(50);
  if (error)
    throw new ApiError(
      503,
      "MESSAGES_READ_FAILED",
      "Message history could not be loaded.",
    );
  return data ?? [];
}
export function requireCandidateEmailConfiguration() {
  const config = getDeliveryEnv();
  if (!config.enabled || !config.apiKey || !config.from || !config.workerSecret)
    throw new ApiError(
      503,
      "EMAIL_NOT_CONFIGURED",
      "Candidate email is not enabled. Your operator must configure delivery and its worker.",
    );
  return { ...config, apiKey: config.apiKey, from: config.from };
}
export async function queueCandidateMessage(
  db: SupabaseClient,
  agencyId: string,
  applicationId: string,
  input: unknown,
  key: string | null,
  requestId: string,
) {
  const payload = candidateMessageSchema.parse(input);
  const idempotencyKey = z.uuid().parse(key);
  await getApplication(db, agencyId, applicationId);
  requireCandidateEmailConfiguration();
  const { data, error } = await db.rpc("queue_candidate_message", {
    p_agency_id: agencyId,
    p_application_id: applicationId,
    p_key: idempotencyKey,
    p_payload: payload,
    p_request_id: requestId,
  });
  if (error) {
    const mapping: Record<string, [number, string]> = {
      candidate_email_suppressed: [
        409,
        "Email delivery is paused for this candidate after a bounce or complaint.",
      ],
      rejection_requires_review: [
        409,
        "Move the application to Rejected and confirm the reviewed message first.",
      ],
      idempotency_conflict: [
        409,
        "This send request was already used. Refresh before composing another message.",
      ],
      message_rate_limited: [
        429,
        "Too many messages for this application. Try again later.",
      ],
      application_not_eligible: [
        409,
        "This application cannot receive an information request.",
      ],
    };
    const match = mapping[error.message];
    throw new ApiError(
      match?.[0] ?? 400,
      "MESSAGE_QUEUE_FAILED",
      match?.[1] ?? "The message could not be queued.",
    );
  }
  return { id: data, status: "pending" };
}
export async function retryCandidateMessage(
  db: SupabaseClient,
  agencyId: string,
  messageId: string,
  requestId: string,
) {
  requireCandidateEmailConfiguration();
  const { error } = await db.rpc("retry_candidate_message", {
    p_agency_id: agencyId,
    p_id: messageId,
    p_request_id: requestId,
  });
  if (error)
    throw new ApiError(
      409,
      "MESSAGE_RETRY_FAILED",
      "This message cannot be retried. Older or uncertain deliveries need operator reconciliation.",
    );
  return { id: messageId, status: "pending" };
}

export async function processNextCandidateMessage(
  admin: SupabaseClient = createAdminClient(),
  send?: (message: {
    to: string;
    subject: string;
    html: string;
    replyTo: string;
    key: string;
  }) => Promise<string>,
) {
  const config = requireCandidateEmailConfiguration();
  const claim = await admin.rpc("claim_candidate_message");
  if (claim.error)
    throw new ApiError(
      503,
      "MESSAGE_CLAIM_FAILED",
      "Message work could not be claimed.",
    );
  const message = claim.data?.[0];
  if (!message) return { processed: false };
  let providerId: string | null = null;
  let failure: string | null = null;
  let retryable = false;
  try {
    const payload = {
      to: message.recipient_email,
      subject: message.subject,
      html: candidateEmail({
        preview: message.subject,
        body: message.body,
      }),
      replyTo: message.reply_to,
      key: `recruta-message:${message.id}`,
    };
    if (send) providerId = await send(payload);
    else {
      const result = await new Resend(config.apiKey).emails.send(
        {
          from: config.from,
          to: payload.to,
          subject: payload.subject,
          html: payload.html,
          replyTo: payload.replyTo,
        },
        { idempotencyKey: payload.key },
      );
      if (result.error) {
        retryable = [
          "application_error",
          "internal_server_error",
          "rate_limit_exceeded",
        ].includes(result.error.name);
        failure = retryable
          ? "provider_unavailable"
          : "provider_request_rejected";
      } else providerId = result.data?.id ?? null;
    }
    if (!providerId && !failure) {
      failure = "provider_unavailable";
      retryable = true;
    }
  } catch {
    failure = "provider_unavailable";
    retryable = true;
  }
  const finish = await admin.rpc("finish_candidate_message", {
    p_id: message.id,
    p_lease: message.lease_token,
    p_provider_id: providerId,
    p_failure: failure,
    p_retryable: retryable,
  });
  if (finish.error)
    throw new ApiError(
      503,
      "MESSAGE_SAVE_FAILED",
      "Delivery state could not be saved; its lease will recover.",
    );
  return {
    processed: true,
    id: message.id,
    committed: !!finish.data,
    failed: !!failure,
  };
}
