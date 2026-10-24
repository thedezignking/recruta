import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { statusEmail } from "@/server/email/templates";
import {
  deliverApplicationEmail,
  getCommunicationForResend,
} from "@/server/services/communications";

export type RequestNotificationType =
  | "request_submitted"
  | "clarification_requested"
  | "request_approved"
  | "job_created";

const content: Record<
  RequestNotificationType,
  { subject: string; title: string; body: string; actionLabel: string }
> = {
  request_submitted: {
    subject: "A hiring request is ready for review",
    title: "New hiring request submitted",
    body: "A client submitted a hiring request. Review its requirements and decide the next action.",
    actionLabel: "Review request",
  },
  clarification_requested: {
    subject: "Your hiring request needs clarification",
    title: "Clarification requested",
    body: "Your recruitment partner left a question on the hiring request. Reply and resubmit when the details are complete.",
    actionLabel: "Open request",
  },
  request_approved: {
    subject: "Your hiring request was approved",
    title: "Request approved",
    body: "Your recruitment partner approved the latest revision and is preparing the active job.",
    actionLabel: "View progress",
  },
  job_created: {
    subject: "Your hiring request is now an active job",
    title: "Recruitment is underway",
    body: "The approved hiring request has been converted into an active job and assigned to the recruitment team.",
    actionLabel: "View job",
  },
};

export async function notifyHiringRequest(
  supabase: SupabaseClient,
  requestId: string,
  messageType: RequestNotificationType,
  idempotencyKey: string,
) {
  try {
    const { data: hiringRequest } = await supabase
      .from("hiring_requests")
      .select("id,title,agency_id,client_id")
      .eq("id", requestId)
      .single();
    if (!hiringRequest) return { status: "skipped" as const };

    let recipientEmail: string | null = null;
    if (messageType === "request_submitted") {
      const { data: agency } = await supabase
        .from("agencies")
        .select("contact_email")
        .eq("id", hiringRequest.agency_id)
        .single();
      recipientEmail = agency?.contact_email ?? null;
    } else {
      const { data: contact } = await supabase
        .from("client_contacts")
        .select("email")
        .eq("client_id", hiringRequest.client_id)
        .eq("is_primary", true)
        .limit(1)
        .maybeSingle();
      recipientEmail = contact?.email ?? null;
    }
    if (!recipientEmail) return { status: "skipped" as const };

    const copy = content[messageType];
    const portalMessage = messageType !== "request_submitted";
    const actionUrl = `${getPublicEnv().NEXT_PUBLIC_APP_URL}/${portalMessage ? "portal/requests" : "app/requests"}/${requestId}`;
    return await deliverApplicationEmail({
      agencyId: hiringRequest.agency_id,
      recipientEmail,
      messageType,
      relatedEntityType: "hiring_request",
      relatedEntityId: requestId,
      idempotencyKey,
      subject: copy.subject,
      html: statusEmail({
        title: copy.title,
        preview: copy.subject,
        body: `${copy.body} Request: ${hiringRequest.title}.`,
        actionLabel: copy.actionLabel,
        actionUrl,
      }),
    });
  } catch (error) {
    console.error("Hiring request notification failed", {
      requestId,
      messageType,
      error,
    });
    return { status: "failed" as const };
  }
}

export async function retryRequestNotification(
  supabase: SupabaseClient,
  agencyId: string,
  communicationId: string,
) {
  const communication = await getCommunicationForResend(
    supabase,
    agencyId,
    communicationId,
  );
  if (
    ![
      "request_submitted",
      "clarification_requested",
      "request_approved",
      "job_created",
    ].includes(communication.message_type) ||
    !communication.related_entity_id
  )
    return null;

  await createAdminClient()
    .from("communications")
    .update({ status: "pending", last_error: null })
    .eq("id", communication.id);
  return notifyHiringRequest(
    supabase,
    communication.related_entity_id,
    communication.message_type as RequestNotificationType,
    communication.idempotency_key,
  );
}
