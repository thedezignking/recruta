import { apiError, ok, requestId } from "@/lib/api";
import { requireAgencyContext } from "@/server/auth/context";
import { approveHiringRequest } from "@/server/services/hiring-requests";
import { notifyHiringRequest } from "@/server/services/notifications";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = requestId(request.headers);
  try {
    const { supabase } = await requireAgencyContext(request, [
      "owner",
      "administrator",
      "recruitment_manager",
    ]);
    const route = await params;
    const hiringRequest = await approveHiringRequest(supabase, route.id, id);
    const delivery = await notifyHiringRequest(
      supabase,
      route.id,
      "request_approved",
      `request-approved:${route.id}:${id}`,
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
