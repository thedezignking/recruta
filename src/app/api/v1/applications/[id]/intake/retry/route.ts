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
    const result = await c.supabase.rpc("retry_application_intake", {
      p_agency_id: c.agencyId,
      p_application_id: z.uuid().parse((await params).id),
    });
    if (result.error)
      throw new ApiError(
        409,
        "INTAKE_RETRY_FAILED",
        "Intake processing could not be retried.",
      );
    return ok({ queued: true });
  } catch (error) {
    return apiError(error, id);
  }
}
