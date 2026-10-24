import { apiError, ok, requestId } from "@/lib/api";
import { requireAgencyContext } from "@/server/auth/context";
import { revokeInvitation } from "@/server/services/invitations";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = requestId(request.headers);
  try {
    const route = await params;
    const { supabase, agencyId } = await requireAgencyContext(request, [
      "owner",
      "administrator",
    ]);
    return ok(
      await revokeInvitation(supabase, {
        agencyId,
        invitationId: route.id,
        kind: "agency",
      }),
      { headers: { "x-request-id": id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
