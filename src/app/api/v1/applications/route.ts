import { apiError, ok, requestId } from "@/lib/api";
import { requireAgencyContext } from "@/server/auth/context";
import { listApplications } from "@/server/services/applications";

export async function GET(request: Request) {
  const id = requestId(request.headers);
  try {
    const { supabase, agencyId } = await requireAgencyContext(request);
    const url = new URL(request.url);
    return ok(
      await listApplications(
        supabase,
        agencyId,
        Object.fromEntries(url.searchParams),
      ),
      { headers: { "x-request-id": id, "cache-control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
