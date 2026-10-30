import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api";

// Bind the verified page/request workspace to its resource. The RPC still
// independently authorizes the live actor, job assignment and tenant.
export async function requireJobMutationResource(
  supabase: SupabaseClient,
  agencyId: string,
  resourceId: string,
  table: "jobs" | "hiring_requests" = "jobs",
) {
  const { data, error } = await supabase
    .from(table)
    .select("id")
    .eq("agency_id", agencyId)
    .eq("id", resourceId)
    .maybeSingle();
  if (error)
    throw new ApiError(
      500,
      "RESOURCE_LOOKUP_FAILED",
      "Access could not be verified. Try again.",
    );
  if (!data)
    throw new ApiError(
      404,
      "RESOURCE_NOT_FOUND",
      "This record is not available in this workspace.",
    );
}

export function jobAuthorizationError(error: {
  message: string;
  code?: string;
}) {
  if (error.message.includes("authentication_required"))
    return new ApiError(401, "AUTHENTICATION_REQUIRED", "Sign in to continue.");
  if (error.code === "42501" || error.message.includes("permission_denied"))
    return new ApiError(
      403,
      "PERMISSION_DENIED",
      "You do not have permission to change this job.",
    );
  return null;
}
