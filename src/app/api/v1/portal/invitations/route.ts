import { ApiError, apiError, ok, readJson, requestId } from "@/lib/api";
import { requireClientContext } from "@/server/auth/context";
import {
  inviteClientMember,
  listInvitations,
} from "@/server/services/invitations";

export async function GET(request: Request) {
  const id = requestId(request.headers);
  try {
    const { supabase, agencyId, clientId } = await requireClientContext(
      request,
      ["client_administrator"],
    );
    return ok(await listInvitations(supabase, { agencyId, clientId }), {
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
    if (!idempotencyKey)
      throw new ApiError(
        400,
        "IDEMPOTENCY_KEY_REQUIRED",
        "Idempotency-Key is required.",
      );
    const { supabase, agencyId, clientId, user } = await requireClientContext(
      request,
      ["client_administrator"],
    );
    return ok(
      await inviteClientMember(
        supabase,
        { agencyId, clientId, userId: user.id },
        await readJson(request),
        idempotencyKey,
      ),
      { status: 201, headers: { "x-request-id": id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
