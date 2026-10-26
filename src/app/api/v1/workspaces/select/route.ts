import { apiError, ok, readJson, requestId, ApiError } from "@/lib/api";
import { workspaceSelectionSchema } from "@/lib/workspace-selection";
import { requireUser } from "@/server/auth/context";
import { selectWorkspaceCookie } from "@/server/auth/workspace-cookie";
import { verifyWorkspaceAccess } from "@/server/services/workspace";
import { isSameOriginRequest } from "@/lib/request-origin";

export async function POST(request: Request) {
  const id = requestId(request.headers);
  try {
    if (!isSameOriginRequest(request))
      throw new ApiError(403, "INVALID_ORIGIN", "This request is not allowed.");
    const { supabase, user } = await requireUser();
    const { agencyId } = workspaceSelectionSchema.parse(
      await readJson(request),
    );
    await verifyWorkspaceAccess(supabase, user.id, agencyId);
    await selectWorkspaceCookie(user.id, agencyId, request.url);
    return ok(
      { agencyId },
      { headers: { "x-request-id": id, "cache-control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
