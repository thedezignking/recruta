import { apiError, ok, readJson, requestId } from "@/lib/api";
import { requireAgencyContext } from "@/server/auth/context";
import { requestClarification } from "@/server/services/hiring-requests";
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
      "recruiter",
    ]);
    const route = await params;
    const hiringRequest = await requestClarification(
      supabase,
      route.id,
      await readJson(request),
      id,
    );
    const delivery = await notifyHiringRequest(
      supabase,
      route.id,
      "clarification_requested",
      `clarification-requested:${route.id}:${id}`,
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
