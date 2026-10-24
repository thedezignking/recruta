import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendApplicationEmail } from "@/server/email/resend";

export type CommunicationInput = {
  agencyId: string;
  recipientEmail: string;
  messageType: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  idempotencyKey: string;
};

export async function createPendingCommunication(input: CommunicationInput) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("communications")
    .upsert(
      {
        agency_id: input.agencyId,
        recipient_email: input.recipientEmail.toLowerCase(),
        message_type: input.messageType,
        related_entity_type: input.relatedEntityType ?? null,
        related_entity_id: input.relatedEntityId ?? null,
        idempotency_key: input.idempotencyKey,
      },
      { onConflict: "agency_id,idempotency_key", ignoreDuplicates: true },
    )
    .select("id,status,attempt_count,provider_message_id")
    .maybeSingle();

  if (error)
    throw new ApiError(
      500,
      "COMMUNICATION_CREATE_FAILED",
      "Delivery tracking could not be created.",
    );

  if (data) return data;
  const { data: existing, error: lookupError } = await admin
    .from("communications")
    .select("id,status,attempt_count,provider_message_id")
    .eq("agency_id", input.agencyId)
    .eq("idempotency_key", input.idempotencyKey)
    .single();
  if (lookupError || !existing)
    throw new ApiError(
      500,
      "COMMUNICATION_LOOKUP_FAILED",
      "Delivery tracking could not be loaded.",
    );
  return existing;
}

export async function markCommunication(
  communicationId: string,
  update: {
    status: "sent" | "failed" | "permanent_failure";
    providerMessageId?: string | null;
    lastError?: string | null;
  },
) {
  const admin = createAdminClient();
  const { data: current } = await admin
    .from("communications")
    .select("attempt_count")
    .eq("id", communicationId)
    .single();
  const attempts = (current?.attempt_count ?? 0) + 1;
  await admin
    .from("communications")
    .update({
      status: update.status,
      provider_message_id: update.providerMessageId ?? null,
      last_error: update.lastError?.slice(0, 1000) ?? null,
      attempt_count: attempts,
      sent_at: update.status === "sent" ? new Date().toISOString() : null,
    })
    .eq("id", communicationId);
  return { status: update.status, attempts };
}

export async function deliverApplicationEmail(
  input: CommunicationInput & {
    subject: string;
    html: string;
  },
) {
  const communication = await createPendingCommunication(input);
  if (["sent", "delivered"].includes(communication.status)) {
    return {
      communicationId: communication.id,
      status: communication.status,
      duplicate: true,
    };
  }

  try {
    const providerMessageId = await sendApplicationEmail({
      to: input.recipientEmail,
      subject: input.subject,
      html: input.html,
    });
    await markCommunication(communication.id, {
      status: "sent",
      providerMessageId,
    });
    return { communicationId: communication.id, status: "sent" as const };
  } catch (error) {
    await markCommunication(communication.id, {
      status: "failed",
      lastError: error instanceof Error ? error.message : "Unknown error",
    });
    return { communicationId: communication.id, status: "failed" as const };
  }
}

export async function getCommunicationForResend(
  supabase: SupabaseClient,
  agencyId: string,
  communicationId: string,
) {
  const { data, error } = await supabase
    .from("communications")
    .select(
      "id,agency_id,recipient_email,message_type,related_entity_type,related_entity_id,status,idempotency_key,attempt_count",
    )
    .eq("agency_id", agencyId)
    .eq("id", communicationId)
    .single();
  if (error || !data)
    throw new ApiError(
      404,
      "COMMUNICATION_NOT_FOUND",
      "The delivery record was not found.",
    );
  return data;
}
