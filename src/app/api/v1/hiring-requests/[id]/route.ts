import { apiError, ok, requestId } from "@/lib/api";
import { requireUser } from "@/server/auth/context";
import { getHiringRequest } from "@/server/services/hiring-requests";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = requestId(request.headers);
  try {
    const route = await params;
    const { supabase } = await requireUser();
    return ok(await getHiringRequest(supabase, route.id), {
      headers: { "x-request-id": id },
    });
  } catch (error) {
    return apiError(error, id);
  }
}
