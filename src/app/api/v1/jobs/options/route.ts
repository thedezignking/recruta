import { apiError, ok, requestId } from "@/lib/api";
import { requireAgencyContext } from "@/server/auth/context";
import { jobOptions } from "@/server/services/job-options";
export async function GET(request: Request) {
  const id = requestId(request.headers);
  try {
    const c = await requireAgencyContext(request);
    const q = new URL(request.url).searchParams;
    return ok(
      await jobOptions(c.supabase, c.agencyId, {
        q: q.get("q") ?? "",
        cursor: q.get("cursor") ?? undefined,
      }),
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (e) {
    return apiError(e, id);
  }
}
