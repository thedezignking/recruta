import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hiringRequestSchema } from "@/lib/validation";
import { ApiError } from "@/lib/api";
export async function savePortalRequest(
  db: SupabaseClient,
  clientId: string,
  input: unknown,
  existingId?: string,
) {
  const payload = hiringRequestSchema.parse(input);
  const meta = z
    .object({
      requestId: z.uuid(),
      expectedUpdatedAt: z.iso.datetime({ offset: true }).optional(),
    })
    .parse(input);
  if (
    payload.clientId !== clientId ||
    (existingId && meta.requestId !== existingId)
  )
    throw new ApiError(
      403,
      "CLIENT_ACCESS_DENIED",
      "This request belongs to another organization.",
    );
  if (existingId && !meta.expectedUpdatedAt)
    throw new ApiError(
      422,
      "VERSION_REQUIRED",
      "Refresh the request before saving.",
    );
  const { data, error } = await db.rpc("save_client_request", {
    p_id: meta.requestId,
    p_client_id: clientId,
    p_payload: {
      ...payload,
      targetHireDate: payload.targetHireDate?.toISOString().slice(0, 10),
    },
    p_expected_updated_at: meta.expectedUpdatedAt ?? null,
  });
  if (error)
    throw new ApiError(
      error.message === "permission_denied" ? 403 : 409,
      "REQUEST_SAVE_FAILED",
      error.message === "request_changed"
        ? "This request changed. Refresh before saving again."
        : "The draft could not be saved.",
    );
  return data;
}
