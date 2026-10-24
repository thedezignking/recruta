import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api";
import { getCommunicationForResend } from "@/server/services/communications";
import { resendInvitation } from "@/server/services/invitations";
import { retryRequestNotification } from "@/server/services/notifications";

export async function resendCommunication(
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
    ["agency_invitation", "client_invitation"].includes(
      communication.message_type,
    )
  )
    return resendInvitation(supabase, agencyId, communicationId);
  const result = await retryRequestNotification(
    supabase,
    agencyId,
    communicationId,
  );
  if (result) return result;
  throw new ApiError(
    422,
    "RESEND_UNSUPPORTED",
    "This message type cannot be resent.",
  );
}
