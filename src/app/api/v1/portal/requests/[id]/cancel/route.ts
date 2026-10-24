import { apiError, ok, requestId } from "@/lib/api";
import { requireClientContext } from "@/server/auth/context";
import { transitionRequest } from "@/server/services/hiring-requests";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = requestId(request.headers);
  try {
    const route = await params;
    const { supabase, agencyId, user } = await requireClientContext(request, [
      "client_administrator",
      "hiring_manager",
    ]);
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
