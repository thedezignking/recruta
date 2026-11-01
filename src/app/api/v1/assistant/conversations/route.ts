import { apiError, ok, requestId } from "@/lib/api";
import { listConversations } from "@/server/assistant/conversations";
import { requireAgencyContext } from "@/server/auth/context";

/** The signed-in person's saved chats in this workspace. */
export async function GET(request: Request) {
  const id = requestId(request.headers);
  try {
    const context = await requireAgencyContext(request);
    return ok(
      await listConversations(
        context.supabase,
        context.agencyId,
        context.user.id,
      ),
      { headers: { "x-request-id": id, "cache-control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
