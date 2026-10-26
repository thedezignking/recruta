import { apiError, ok, requestId } from "@/lib/api";
import { requireAgencyContext } from "@/server/auth/context";
import { searchWorkspace } from "@/server/services/search";

export async function GET(request: Request) {
  const id = requestId(request.headers);
  try {
    const { supabase, agencyId } = await requireAgencyContext(request);
    return ok(
      await searchWorkspace(
        supabase,
        agencyId,
        new URL(request.url).searchParams.get("q") ?? "",
      ),
      { headers: { "cache-control": "private, no-store", "x-request-id": id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
