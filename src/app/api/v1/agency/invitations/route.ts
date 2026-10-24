import { ApiError, apiError, ok, readJson, requestId } from "@/lib/api";
import { requireAgencyContext } from "@/server/auth/context";
import {
  inviteAgencyMember,
  listInvitations,
} from "@/server/services/invitations";

export async function GET(request: Request) {
  const id = requestId(request.headers);
  try {
    const { supabase, agencyId } = await requireAgencyContext(request, [
      "owner",
      "administrator",
    ]);
    return ok(await listInvitations(supabase, { agencyId }), {
      headers: { "x-request-id": id },
    });
  } catch (error) {
    return apiError(error, id);
  }
}

export async function POST(request: Request) {
  const id = requestId(request.headers);
  try {
    const idempotencyKey = request.headers.get("idempotency-key");
    if (!idempotencyKey) {
      return apiError(
        new ApiError(
          400,
          "IDEMPOTENCY_KEY_REQUIRED",
          "Idempotency-Key is required.",
        ),
        id,
      );
    }
    const { supabase, agencyId, user } = await requireAgencyContext(request, [
      "owner",
      "administrator",
    ]);
    const invitation = await inviteAgencyMember(
      supabase,
      { agencyId, userId: user.id },
      await readJson(request),
      idempotencyKey,
    );
    return ok(invitation, { status: 201, headers: { "x-request-id": id } });
  } catch (error) {
    return apiError(error, id);
  }
}
