import { apiError, ok, requestId } from "@/lib/api";
import { requireClientContext } from "@/server/auth/context";
import { getHiringRequest } from "@/server/services/hiring-requests";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = requestId(request.headers);
  try {
    const route = await params;
    const { supabase } = await requireClientContext(request);
    return ok(await getHiringRequest(supabase, route.id), {
      headers: { "x-request-id": id },
    });
  } catch (error) {
    return apiError(error, id);
  }
}
