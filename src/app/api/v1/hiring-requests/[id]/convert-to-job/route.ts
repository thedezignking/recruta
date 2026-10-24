import { ApiError, apiError, ok, readJson, requestId } from "@/lib/api";
import { requireAgencyContext } from "@/server/auth/context";
import { convertHiringRequest } from "@/server/services/hiring-requests";
import { notifyHiringRequest } from "@/server/services/notifications";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = requestId(request.headers);
  try {
    const idempotencyKey = request.headers.get("idempotency-key");
    if (!idempotencyKey)
      throw new ApiError(
        400,
        "IDEMPOTENCY_KEY_REQUIRED",
        "Provide an Idempotency-Key header.",
      );
    const { supabase } = await requireAgencyContext(request, [
      "owner",
      "administrator",
      "recruitment_manager",
    ]);
    const route = await params;
    const job = await convertHiringRequest(
      supabase,
      route.id,
      await readJson(request),
      idempotencyKey,
    );
    const delivery = await notifyHiringRequest(
      supabase,
      route.id,
      "job_created",
      `job-created:${route.id}:${idempotencyKey}`,
    );
    return ok({ job, delivery }, { headers: { "x-request-id": id } });
  } catch (error) {
    return apiError(error, id);
  }
}
