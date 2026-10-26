import { apiError, ok, readJson, requestId, ApiError } from "@/lib/api";
import { requireAgencyContext } from "@/server/auth/context";
import { manageCollaborator } from "@/server/services/collaboration";
import { inviteClientMember } from "@/server/services/invitations";
import { jobInvitationSchema } from "@/lib/collaboration";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = requestId(request.headers);
  try {
    const c = await requireAgencyContext(request);
    const p = await params;
    return ok(
      await manageCollaborator(
        c.supabase,
        c.agencyId,
        p.id,
        await readJson(request),
        id,
      ),
    );
  } catch (error) {
    return apiError(error, id);
  }
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = requestId(request.headers);
  try {
    const c = await requireAgencyContext(request);
    const p = await params;
    const key = request.headers.get("Idempotency-Key");
    if (!key || key.length > 200)
      throw new ApiError(
        422,
        "IDEMPOTENCY_KEY_REQUIRED",
        "Provide an invitation request key.",
      );
    const { data: job, error } = await c.supabase
      .from("jobs")
      .select("id,client_id")
      .eq("agency_id", c.agencyId)
      .eq("id", p.id)
      .single();
    if (error || !job)
      throw new ApiError(404, "JOB_NOT_FOUND", "Job not found.");
    const payload = jobInvitationSchema.parse(await readJson(request));
    return ok(
      await inviteClientMember(
        c.supabase,
        {
          agencyId: c.agencyId,
          clientId: job.client_id,
          userId: c.user.id,
          jobId: job.id,
        },
        payload,
        key,
      ),
      { status: 201 },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
