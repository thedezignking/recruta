import { apiError, ok, requestId } from "@/lib/api";
import { requireAgencyContext } from "@/server/auth/context";
import { resendCommunication } from "@/server/services/delivery";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = requestId(request.headers);
  try {
    const route = await params;
    const { supabase, agencyId } = await requireAgencyContext(request, [
      "owner",
      "administrator",
      "recruitment_manager",
    ]);
    return ok(await resendCommunication(supabase, agencyId, route.id), {
      headers: { "x-request-id": id },
    });
  } catch (error) {
    return apiError(error, id);
  }
}
