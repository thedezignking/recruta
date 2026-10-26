import { apiError, ok, readJson, requestId, ApiError } from "@/lib/api";
import { requireClientContext } from "@/server/auth/context";
import {
  getHiringRequest,
  createRequestMessage,
} from "@/server/services/hiring-requests";
import { requestMessageSchema } from "@/lib/validation";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rid = requestId(request.headers);
  try {
    const c = await requireClientContext(request, [
      "client_administrator",
      "hiring_manager",
    ]);
    const { id } = await params;
    const r = await getHiringRequest(c.supabase, id);
    if (r.client_id !== c.clientId)
      throw new ApiError(404, "REQUEST_NOT_FOUND", "Request not found.");
    const p = requestMessageSchema.parse(await readJson(request));
    return ok(
      await createRequestMessage(c.supabase, c.user.id, id, {
        ...p,
        visibility: "client_visible",
      }),
      { status: 201 },
    );
  } catch (e) {
    return apiError(e, rid);
  }
}
