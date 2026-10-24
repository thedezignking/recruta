import { apiError, ok, requestId } from "@/lib/api";
import { requireAgencyContext } from "@/server/auth/context";
import { listApplications } from "@/server/services/applications";

export async function GET(request: Request) {
  const id = requestId(request.headers);
  try {
    const { supabase, agencyId } = await requireAgencyContext(request);
    const url = new URL(request.url);
    return ok(
      await listApplications(supabase, agencyId, {
        jobId: url.searchParams.get("jobId"),
        cursor: url.searchParams.get("cursor"),
      }),
      { headers: { "x-request-id": id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
