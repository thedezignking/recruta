import { apiError, ok, requestId, readJson, ApiError } from "@/lib/api";
import { savePortalRequest } from "@/server/services/portal-requests";
import { requireClientContext } from "@/server/auth/context";
import { getHiringRequest } from "@/server/services/hiring-requests";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = requestId(request.headers);
  try {
    const route = await params;
    const { supabase, clientId } = await requireClientContext(request);
    const result = await getHiringRequest(supabase, route.id);
    if (result.client_id !== clientId)
      throw new ApiError(404, "REQUEST_NOT_FOUND", "Request not found.");
    return ok(result, {
      headers: { "x-request-id": id },
    });
  } catch (error) {
    return apiError(error, id);
  }
}
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rid = requestId(request.headers);
  try {
    const c = await requireClientContext(request, [
      "client_administrator",
      "hiring_manager",
    ]);
    return ok(
      await savePortalRequest(
        c.supabase,
        c.clientId,
        await readJson(request),
        (await params).id,
      ),
    );
  } catch (e) {
    return apiError(e, rid);
  }
}
