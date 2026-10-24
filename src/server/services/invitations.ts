import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api";
import { invitationExpiresAt } from "@/features/invitations/policy";
import { getPublicEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  agencyInvitationSchema,
  clientInvitationSchema,
  invitationAcceptanceSchema,
} from "@/lib/validation";
import { sendApplicationEmail } from "@/server/email/resend";
import { statusEmail } from "@/server/email/templates";
import {
  createPendingCommunication,
  getCommunicationForResend,
  markCommunication,
} from "@/server/services/communications";

type InvitationKind = "agency" | "client";

function invitationToken() {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: createHash("sha256").update(token).digest("hex"),
  };
}

async function deliverInvitation(input: {
  agencyId: string;
  invitationId: string;
  email: string;
  token: string;
  kind: InvitationKind;
  idempotencyKey: string;
}) {
  const communication = await createPendingCommunication({
    agencyId: input.agencyId,
    recipientEmail: input.email,
    messageType: `${input.kind}_invitation`,
    relatedEntityType: `${input.kind}_invitation`,
    relatedEntityId: input.invitationId,
    idempotencyKey: input.idempotencyKey,
  });
  if (["sent", "delivered"].includes(communication.status)) {
    return { communicationId: communication.id, status: communication.status };
  }

  const acceptUrl = `${getPublicEnv().NEXT_PUBLIC_APP_URL}/invitations/${encodeURIComponent(input.token)}?kind=${input.kind}`;
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(
    input.email,
    {
      redirectTo: acceptUrl,
    },
  );

  if (!error) {
    await markCommunication(communication.id, {
      status: "sent",
      providerMessageId: data.user?.id ?? "supabase-auth",
    });
    return { communicationId: communication.id, status: "sent" as const };
  }

  if (error.message.toLowerCase().includes("already")) {
    try {
      const providerMessageId = await sendApplicationEmail({
        to: input.email,
        subject: "You have been invited to Recruta",
        html: statusEmail({
          title: "Join your team on Recruta",
          preview: "An invitation is waiting for you.",
          body: "Sign in with this email address to accept the invitation and access your workspace.",
          actionLabel: "Accept invitation",
          actionUrl: acceptUrl,
        }),
      });
      await markCommunication(communication.id, {
        status: "sent",
        providerMessageId,
      });
      return { communicationId: communication.id, status: "sent" as const };
    } catch (fallbackError) {
      await markCommunication(communication.id, {
        status: "failed",
        lastError:
          fallbackError instanceof Error
            ? fallbackError.message
            : "Unknown delivery error",
      });
      return { communicationId: communication.id, status: "failed" as const };
    }
  }

  await markCommunication(communication.id, {
    status: "failed",
    lastError: error.message,
  });
  return { communicationId: communication.id, status: "failed" as const };
}

async function findIdempotentInvitation(
  supabase: SupabaseClient,
  agencyId: string,
  idempotencyKey: string,
) {
  const { data } = await supabase
    .from("communications")
    .select("id,status,related_entity_type,related_entity_id")
    .eq("agency_id", agencyId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (!data?.related_entity_id || !data.related_entity_type) return null;
  const table =
    data.related_entity_type === "agency_invitation"
      ? "agency_invitations"
      : data.related_entity_type === "client_invitation"
        ? "client_invitations"
        : null;
  if (!table) return null;
  const { data: invitation } = await supabase
    .from(table)
    .select("id,email,role,expires_at")
    .eq("id", data.related_entity_id)
    .single();
  return invitation
    ? {
        invitation,
        delivery: { communicationId: data.id, status: data.status },
        duplicate: true,
      }
    : null;
}

export async function inviteAgencyMember(
  supabase: SupabaseClient,
  context: { agencyId: string; userId: string },
  input: unknown,
  idempotencyKey: string,
) {
  const existing = await findIdempotentInvitation(
    supabase,
    context.agencyId,
    idempotencyKey,
  );
  if (existing) return existing;

  const payload = agencyInvitationSchema.parse(input);
  const { token, tokenHash } = invitationToken();
  const expiresAt = invitationExpiresAt();
  const { data: invitation, error } = await supabase
    .from("agency_invitations")
    .insert({
      agency_id: context.agencyId,
      email: payload.email.toLowerCase(),
      role: payload.role,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
      invited_by: context.userId,
    })
    .select("id,email,role,expires_at")
    .single();
  if (error || !invitation)
    throw new ApiError(
      409,
      "INVITATION_CREATE_FAILED",
      "An active invitation may already exist for this email.",
    );

  const delivery = await deliverInvitation({
    agencyId: context.agencyId,
    invitationId: invitation.id,
    email: invitation.email,
    token,
    kind: "agency",
    idempotencyKey,
  });
  return { invitation, delivery };
}

export async function inviteClientMember(
  supabase: SupabaseClient,
  context: { agencyId: string; clientId: string; userId: string },
  input: unknown,
  idempotencyKey: string,
) {
  const existing = await findIdempotentInvitation(
    supabase,
    context.agencyId,
    idempotencyKey,
  );
  if (existing) return existing;

  const payload = clientInvitationSchema.parse(input);
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id")
    .eq("agency_id", context.agencyId)
    .eq("id", context.clientId)
    .single();
  if (clientError || !client)
    throw new ApiError(404, "CLIENT_NOT_FOUND", "The client was not found.");

  const { token, tokenHash } = invitationToken();
  const expiresAt = invitationExpiresAt();
  const { data: invitation, error } = await supabase
    .from("client_invitations")
    .insert({
      agency_id: context.agencyId,
      client_id: context.clientId,
      email: payload.email.toLowerCase(),
      role: payload.role,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
      invited_by: context.userId,
    })
    .select("id,email,role,expires_at")
    .single();
  if (error || !invitation)
    throw new ApiError(
      409,
      "INVITATION_CREATE_FAILED",
      "An active invitation may already exist for this email.",
    );

  const delivery = await deliverInvitation({
    agencyId: context.agencyId,
    invitationId: invitation.id,
    email: invitation.email,
    token,
    kind: "client",
    idempotencyKey,
  });
  return { invitation, delivery };
}

export async function acceptInvitation(
  supabase: SupabaseClient,
  input: unknown,
) {
  const payload = invitationAcceptanceSchema.parse(input);
  const tokenHash = createHash("sha256").update(payload.token).digest("hex");
  const functionName =
    payload.kind === "agency"
      ? "accept_agency_invitation"
      : "accept_client_invitation";
  const { data, error } = await supabase.rpc(functionName, {
    p_token_hash: tokenHash,
  });
  if (error) throw new ApiError(409, "INVITATION_ACCEPT_FAILED", error.message);
  return data;
}

export async function resendInvitation(
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
    communication.message_type !== "agency_invitation" &&
    communication.message_type !== "client_invitation"
  )
    throw new ApiError(
      422,
      "RESEND_UNSUPPORTED",
      "This message type cannot be resent from this endpoint.",
    );

  const kind: InvitationKind =
    communication.message_type === "agency_invitation" ? "agency" : "client";
  const table = kind === "agency" ? "agency_invitations" : "client_invitations";
  const { data: invitation, error } = await supabase
    .from(table)
    .select("id,email,accepted_at,revoked_at")
    .eq("id", communication.related_entity_id)
    .single();
  if (error || !invitation)
    throw new ApiError(404, "INVITATION_NOT_FOUND", "Invitation not found.");
  if (invitation.accepted_at || invitation.revoked_at)
    throw new ApiError(
      409,
      "INVITATION_INACTIVE",
      "Accepted or revoked invitations cannot be resent.",
    );

  const { token, tokenHash } = invitationToken();
  const { error: updateError } = await supabase
    .from(table)
    .update({
      token_hash: tokenHash,
      expires_at: invitationExpiresAt().toISOString(),
    })
    .eq("id", invitation.id);
  if (updateError)
    throw new ApiError(409, "INVITATION_UPDATE_FAILED", updateError.message);

  await createAdminClient()
    .from("communications")
    .update({ status: "pending", last_error: null })
    .eq("id", communication.id);

  return deliverInvitation({
    agencyId,
    invitationId: invitation.id,
    email: invitation.email,
    token,
    kind,
    idempotencyKey: communication.idempotency_key,
  });
}

export async function listInvitations(
  supabase: SupabaseClient,
  input: { agencyId: string; clientId?: string },
) {
  const table = input.clientId ? "client_invitations" : "agency_invitations";
  let query = supabase
    .from(table)
    .select("id,email,role,expires_at,accepted_at,revoked_at,created_at")
    .eq("agency_id", input.agencyId)
    .order("created_at", { ascending: false });
  if (input.clientId) query = query.eq("client_id", input.clientId);
  const { data, error } = await query;
  if (error)
    throw new ApiError(
      500,
      "INVITATION_LIST_FAILED",
      "Invitations could not be loaded.",
    );
  return { items: data ?? [] };
}

export async function revokeInvitation(
  supabase: SupabaseClient,
  input: {
    agencyId: string;
    invitationId: string;
    kind: InvitationKind;
    clientId?: string;
  },
) {
  const table =
    input.kind === "agency" ? "agency_invitations" : "client_invitations";
  let query = supabase
    .from(table)
    .update({ revoked_at: new Date().toISOString() })
    .eq("agency_id", input.agencyId)
    .eq("id", input.invitationId)
    .is("accepted_at", null)
    .is("revoked_at", null);
  if (input.clientId) query = query.eq("client_id", input.clientId);
  const { data, error } = await query
    .select("id,email,role,revoked_at")
    .maybeSingle();
  if (error || !data)
    throw new ApiError(
      404,
      "INVITATION_NOT_FOUND",
      "No active invitation was found.",
    );
  return data;
}
