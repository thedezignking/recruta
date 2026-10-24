import { ApiError } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import type { AgencyRole, ClientRole } from "@/types/domain";

export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user)
    throw new ApiError(401, "AUTHENTICATION_REQUIRED", "Sign in to continue.");
  return { supabase, user: data.user };
}

export async function requireAgencyContext(
  request: Request,
  allowedRoles?: AgencyRole[],
) {
  const { supabase, user } = await requireUser();
  const requestedAgencyId = request.headers.get("x-agency-id");
  let query = supabase
    .from("agency_memberships")
    .select("agency_id, role, status")
    .eq("user_id", user.id)
    .eq("status", "active");
  if (requestedAgencyId) query = query.eq("agency_id", requestedAgencyId);
  const { data, error } = await query.limit(2);
  if (error)
    throw new ApiError(
      500,
      "MEMBERSHIP_LOOKUP_FAILED",
      "Agency access could not be verified.",
    );
  if (!data?.length)
    throw new ApiError(
      403,
      "AGENCY_ACCESS_DENIED",
      "You do not have access to this agency.",
    );
  if (!requestedAgencyId && data.length > 1)
    throw new ApiError(
      400,
      "AGENCY_CONTEXT_REQUIRED",
      "Choose an agency before continuing.",
    );
  const membership = data[0] as {
    agency_id: string;
    role: AgencyRole;
    status: string;
  };
  if (allowedRoles && !allowedRoles.includes(membership.role))
    throw new ApiError(
      403,
      "PERMISSION_DENIED",
      "Your role cannot perform this action.",
    );
  return {
    supabase,
    user,
    agencyId: membership.agency_id,
    role: membership.role,
  };
}

export async function requireAgencyPageContext() {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("agency_memberships")
    .select("agency_id,role,status,created_at")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();
  if (error || !data) {
    throw new ApiError(
      403,
      "AGENCY_ACCESS_DENIED",
      "Set up or join an agency before opening the workspace.",
    );
  }
  return {
    supabase,
    user,
    agencyId: data.agency_id,
    role: data.role as AgencyRole,
  };
}

export async function requireClientContext(
  request: Request,
  allowedRoles?: ClientRole[],
) {
  const { supabase, user } = await requireUser();
  const requestedClientId = request.headers.get("x-client-id");
  let query = supabase
    .from("client_memberships")
    .select("agency_id, client_id, role, status")
    .eq("user_id", user.id)
    .eq("status", "active");
  if (requestedClientId) query = query.eq("client_id", requestedClientId);
  const { data, error } = await query.limit(2);
  if (error)
    throw new ApiError(
      500,
      "MEMBERSHIP_LOOKUP_FAILED",
      "Client access could not be verified.",
    );
  if (!data?.length)
    throw new ApiError(
      403,
      "CLIENT_ACCESS_DENIED",
      "You do not have access to this client.",
    );
  if (!requestedClientId && data.length > 1)
    throw new ApiError(
      400,
      "CLIENT_CONTEXT_REQUIRED",
      "Choose a client before continuing.",
    );
  const membership = data[0] as {
    agency_id: string;
    client_id: string;
    role: ClientRole;
    status: string;
  };
  if (allowedRoles && !allowedRoles.includes(membership.role))
    throw new ApiError(
      403,
      "PERMISSION_DENIED",
      "Your role cannot perform this action.",
    );
  return {
    supabase,
    user,
    agencyId: membership.agency_id,
    clientId: membership.client_id,
    role: membership.role,
  };
}
