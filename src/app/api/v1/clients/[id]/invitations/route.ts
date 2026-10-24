import { ApiError, apiError, ok, readJson, requestId } from "@/lib/api";
import { requireAgencyContext } from "@/server/auth/context";
import {
  inviteClientMember,
  listInvitations,
} from "@/server/services/invitations";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = requestId(request.headers);
  try {
    const route = await params;
    const { supabase, agencyId } = await requireAgencyContext(request, [
      "owner",
      "administrator",
      "recruitment_manager",
    ]);
    return ok(
      await listInvitations(supabase, { agencyId, clientId: route.id }),
      { headers: { "x-request-id": id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = requestId(request.headers);
  try {
    const idempotencyKey = request.headers.get("idempotency-key");
    if (!idempotencyKey)
      throw new ApiError(
        400,
        "IDEMPOTENCY_KEY_REQUIRED",
        "Idempotency-Key is required.",
      );
    const route = await params;
    const { supabase, agencyId, user } = await requireAgencyContext(request, [
      "owner",
      "administrator",
      "recruitment_manager",
    ]);
    const invitation = await inviteClientMember(
      supabase,
      { agencyId, clientId: route.id, userId: user.id },
      await readJson(request),
      idempotencyKey,
    );
    return ok(invitation, { status: 201, headers: { "x-request-id": id } });
  } catch (error) {
    return apiError(error, id);
  }
}
