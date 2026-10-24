import { apiError, ok, requestId } from "@/lib/api";
import { requireClientContext } from "@/server/auth/context";
import { listJobs } from "@/server/services/jobs";

export async function GET(request: Request) {
  const id = requestId(request.headers);
  try {
    const { supabase, clientId } = await requireClientContext(request);
    const cursor = new URL(request.url).searchParams.get("cursor");
    return ok(await listJobs(supabase, { clientId }, cursor), {
      headers: { "x-request-id": id },
    });
  } catch (error) {
    return apiError(error, id);
  }
}
