import { ApiError } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import type { AgencyRole, ClientRole } from "@/types/domain";
import { portalMembershipsSchema } from "@/lib/collaboration";
import { cookies } from "next/headers";
import {
  parseWorkspaceSelection,
  workspaceCookieName,
} from "@/lib/workspace-selection";

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
  const explicitAgencyId = request.headers.get("x-agency-id");
  if (explicitAgencyId && !parseWorkspaceSelection(explicitAgencyId))
    throw new ApiError(400, "INVALID_AGENCY_ID", "Choose a valid workspace.");
  const preferredAgencyId =
    explicitAgencyId ||
    parseWorkspaceSelection(
      (await cookies()).get(workspaceCookieName(user.id))?.value,
    );
  const query = supabase
    .from("agency_memberships")
    .select("agency_id,role,status,agencies!inner(status)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .eq("agencies.status", "active");
  const { data, error } = await query
    .order("created_at", { ascending: true })
    .order("agency_id");
  if (error)
    throw new ApiError(
      500,
      "MEMBERSHIP_LOOKUP_FAILED",
      "Agency access could not be verified.",
    );
  const selected = data?.find(
    (membership) => membership.agency_id === preferredAgencyId,
  );
  const membership = selected ?? (!explicitAgencyId ? data?.[0] : undefined);
  if (!membership)
    throw new ApiError(
      403,
      "AGENCY_ACCESS_DENIED",
      "You do not have access to this agency.",
    );
  if (allowedRoles && !allowedRoles.includes(membership.role as AgencyRole))
    throw new ApiError(
      403,
      "PERMISSION_DENIED",
      "Your role cannot perform this action.",
    );
  return {
    supabase,
    user,
    agencyId: membership.agency_id,
    role: membership.role as AgencyRole,
  };
}

export async function requireAgencyPageContext() {
  const { supabase, user } = await requireUser();
  const selectedAgencyId = parseWorkspaceSelection(
    (await cookies()).get(workspaceCookieName(user.id))?.value,
  );
  const { data: memberships, error } = await supabase
    .from("agency_memberships")
    .select("agency_id,role,status,created_at,agencies!inner(status)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .eq("agencies.status", "active")
    .order("created_at", { ascending: true })
    .order("agency_id");
  const data =
    memberships?.find(
      (membership) => membership.agency_id === selectedAgencyId,
    ) ?? memberships?.[0];
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
  const { data: raw, error } = await supabase.rpc("portal_memberships");
  const memberships = portalMembershipsSchema.parse(raw ?? []);
  const data = requestedClientId
    ? memberships.filter((m) => m.client_id === requestedClientId)
    : memberships;
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
