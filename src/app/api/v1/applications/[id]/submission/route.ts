import { apiError, ok, readJson, requestId } from "@/lib/api";
import { requireAgencyContext } from "@/server/auth/context";
import { shareCandidate } from "@/server/services/collaboration";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = requestId(request.headers);
  try {
    const context = await requireAgencyContext(request);
    const { id: applicationId } = await params;
    return ok(
      await shareCandidate(
        context.supabase,
        context.agencyId,
        applicationId,
        await readJson(request),
        id,
      ),
    );
  } catch (error) {
    return apiError(error, id);
  }
}
