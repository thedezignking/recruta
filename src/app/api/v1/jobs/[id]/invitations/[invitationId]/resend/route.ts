import { apiError, ok, requestId } from "@/lib/api";
import { requireAgencyContext } from "@/server/auth/context";
import { resendJobInvitation } from "@/server/services/collaboration";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; invitationId: string }> },
) {
  const rid = requestId(request.headers);
  try {
    const c = await requireAgencyContext(request);
    const p = await params;
    return ok(
      await resendJobInvitation(c.supabase, c.agencyId, p.id, p.invitationId),
    );
  } catch (e) {
    return apiError(e, rid);
  }
}
