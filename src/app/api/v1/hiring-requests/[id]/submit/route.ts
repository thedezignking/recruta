import { apiError, ok, requestId } from "@/lib/api";
import { requireUser } from "@/server/auth/context";
import { submitHiringRequest } from "@/server/services/hiring-requests";
import { notifyHiringRequest } from "@/server/services/notifications";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = requestId(request.headers);
  try {
    const { supabase } = await requireUser();
    const route = await params;
    const hiringRequest = await submitHiringRequest(supabase, route.id, id);
    const delivery = await notifyHiringRequest(
      supabase,
      route.id,
      "request_submitted",
      `request-submitted:${route.id}:${id}`,
    );
    return ok(
      { hiringRequest, delivery },
      {
        headers: { "x-request-id": id },
      },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
