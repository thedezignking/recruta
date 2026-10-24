import { apiError, ok, readJson, requestId } from "@/lib/api";
import { requireUser } from "@/server/auth/context";
import { acceptInvitation } from "@/server/services/invitations";

export async function POST(request: Request) {
  const id = requestId(request.headers);
  try {
    const { supabase } = await requireUser();
    return ok(await acceptInvitation(supabase, await readJson(request)), {
      headers: { "x-request-id": id },
    });
  } catch (error) {
    return apiError(error, id);
  }
}
