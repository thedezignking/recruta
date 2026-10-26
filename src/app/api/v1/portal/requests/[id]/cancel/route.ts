import { apiError, ok, requestId, ApiError } from "@/lib/api";
import { requireClientContext } from "@/server/auth/context";
import {
  transitionRequest,
  getHiringRequest,
} from "@/server/services/hiring-requests";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = requestId(request.headers);
  try {
    const route = await params;
    const { supabase, agencyId, clientId, user } = await requireClientContext(
      request,
      ["client_administrator", "hiring_manager"],
    );
    if ((await getHiringRequest(supabase, route.id)).client_id !== clientId)
      throw new ApiError(404, "REQUEST_NOT_FOUND", "Request not found.");
    return ok(
      await transitionRequest(supabase, route.id, "cancel", {
        agencyId,
        userId: user.id,
        requestIdHeader: id,
      }),
      { headers: { "x-request-id": id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
