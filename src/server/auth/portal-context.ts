import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "./context";
import { ApiError } from "@/lib/api";
import type { ClientRole } from "@/types/domain";
import { portalMembershipsSchema } from "@/lib/collaboration";

export const portalCookie = (userId: string) => `recruta.portal.${userId}`;
export async function portalMemberships() {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.rpc("portal_memberships");
  if (error)
    throw new ApiError(
      503,
      "PORTAL_UNAVAILABLE",
      "Organization access could not be verified.",
    );
  return {
    supabase,
    user,
    memberships: portalMembershipsSchema.parse(data ?? []),
  };
}
export async function requirePortalPageContext() {
  const result = await portalMemberships().catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 401)
      redirect("/login?next=/portal");
    throw error;
  });
  const selected = (await cookies()).get(portalCookie(result.user.id))?.value;
  const membership =
    result.memberships.find((m) => m.client_id === selected) ??
    result.memberships[0];
  if (!membership) redirect("/portal/no-access");
  return {
    ...result,
    agencyId: membership.agency_id,
    clientId: membership.client_id,
    role: membership.role as ClientRole,
    clientName: membership.client_name,
    agencyName: membership.agency_name,
  };
}
