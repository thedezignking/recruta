import { z } from "zod";
import { apiError, ok, requestId } from "@/lib/api";
import { requireAgencyContext } from "@/server/auth/context";
import { retryCandidateMessage } from "@/server/services/candidate-messages";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = requestId(request.headers);
  try {
    const c = await requireAgencyContext(request);
    return ok(
      await retryCandidateMessage(
        c.supabase,
        c.agencyId,
        z.uuid().parse((await params).id),
        id,
      ),
    );
  } catch (error) {
    return apiError(error, id);
  }
}
