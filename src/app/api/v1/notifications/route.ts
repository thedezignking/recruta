import { apiError, ok, requestId } from "@/lib/api";
import { requireAgencyContext } from "@/server/auth/context";
import { listNotifications } from "@/server/services/workspace-notifications";

export async function GET(request: Request) {
  const id = requestId(request.headers);
  try {
    const { supabase, agencyId, user } = await requireAgencyContext(request);
    return ok(await listNotifications(supabase, agencyId, user.id), {
      headers: { "cache-control": "private, no-store", "x-request-id": id },
    });
  } catch (error) {
    return apiError(error, id);
  }
}
