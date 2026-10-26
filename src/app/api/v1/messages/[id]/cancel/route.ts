import { z } from "zod";
import { apiError, ApiError, ok, requestId } from "@/lib/api";
import { requireAgencyContext } from "@/server/auth/context";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = requestId(request.headers);
  try {
    const c = await requireAgencyContext(request);
    const result = await c.supabase.rpc("cancel_candidate_message", {
      p_agency_id: c.agencyId,
      p_id: z.uuid().parse((await params).id),
      p_request_id: id,
    });
    if (result.error)
      throw new ApiError(
        409,
        "MESSAGE_CANCEL_FAILED",
        "This email is already processing or cannot be cancelled.",
      );
    return ok({ cancelled: true });
  } catch (error) {
    return apiError(error, id);
  }
}
