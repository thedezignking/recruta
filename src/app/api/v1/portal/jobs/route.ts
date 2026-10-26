import { apiError, ok, requestId } from "@/lib/api";
import { requireClientContext } from "@/server/auth/context";
import { listPortalJobs } from "@/server/services/portal";

export async function GET(request: Request) {
  const id = requestId(request.headers);
  try {
    const { supabase, clientId } = await requireClientContext(request);
    const cursor = new URL(request.url).searchParams.get("cursor");
    return ok(await listPortalJobs(supabase, clientId, cursor ?? undefined), {
      headers: { "x-request-id": id },
    });
  } catch (error) {
    return apiError(error, id);
  }
}
