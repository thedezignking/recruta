import { apiError, ok, readJson, requestId, ApiError } from "@/lib/api";
import { requireClientContext } from "@/server/auth/context";
import { submitFeedback } from "@/server/services/collaboration";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = requestId(request.headers);
  try {
    const c = await requireClientContext(request, [
      "client_administrator",
      "hiring_manager",
    ]);
    const p = await params;
    const { data } = await c.supabase
      .from("candidate_submissions")
      .select("id,jobs!inner(client_id)")
      .eq("id", p.id)
      .eq("agency_id", c.agencyId)
      .eq("jobs.client_id", c.clientId)
      .maybeSingle();
    if (!data)
      throw new ApiError(
        404,
        "SUBMISSION_NOT_FOUND",
        "Shared candidate not found.",
      );
    return ok(
      await submitFeedback(c.supabase, p.id, await readJson(request), id),
      { status: 201 },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
