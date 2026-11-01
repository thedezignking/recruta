import { z } from "zod";
import { apiError, ok, readJson, requestId } from "@/lib/api";
import { requireAgencyContext } from "@/server/auth/context";
import { managePipeline } from "@/server/services/pipeline";

/** Interviews, offers and placements for one application (ADR 0008). */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = requestId(request.headers);
  try {
    const context = await requireAgencyContext(request);
    const applicationId = z.uuid().parse((await params).id);
    return ok(
      await managePipeline(
        context.supabase,
        context.agencyId,
        applicationId,
        await readJson(request),
        id,
      ),
      { headers: { "x-request-id": id, "cache-control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
