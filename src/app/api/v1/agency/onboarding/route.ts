import { apiError, ok, readJson, requestId } from "@/lib/api";
import { requireUser } from "@/server/auth/context";
import { createAgencyWorkspace } from "@/server/services/workspace";
import { selectWorkspaceCookie } from "@/server/auth/workspace-cookie";

export async function POST(request: Request) {
  const id = requestId(request.headers);
  try {
    const { supabase, user } = await requireUser();
    const data = await createAgencyWorkspace(supabase, await readJson(request));
    await selectWorkspaceCookie(user.id, data, request.url);
    return ok(
      { agencyId: data },
      { status: 201, headers: { "x-request-id": id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
