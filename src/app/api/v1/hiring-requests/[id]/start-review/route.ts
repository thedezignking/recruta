import { apiError, ok, requestId } from "@/lib/api";
import { requireAgencyContext } from "@/server/auth/context";
import { transitionRequest } from "@/server/services/hiring-requests";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = requestId(request.headers);
  try {
    const { supabase, agencyId, user } = await requireAgencyContext(request, [
      "owner",
      "administrator",
      "recruitment_manager",
      "recruiter",
    ]);
    return ok(
      await transitionRequest(supabase, (await params).id, "start_review", {
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
