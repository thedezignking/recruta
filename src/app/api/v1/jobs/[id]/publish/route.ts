import { apiError, ok, requestId } from "@/lib/api";
import { requireAgencyContext } from "@/server/auth/context";
import { publishJob } from "@/server/services/jobs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = requestId(request.headers);
  try {
    const route = await params;
    const { supabase } = await requireAgencyContext(request, [
      "owner",
      "administrator",
      "recruitment_manager",
      "recruiter",
    ]);
    return ok(await publishJob(supabase, route.id, id), {
      headers: { "x-request-id": id },
    });
  } catch (error) {
    return apiError(error, id);
  }
}
