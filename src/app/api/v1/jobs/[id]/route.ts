import { apiError, ok, readJson, requestId } from "@/lib/api";
import { requireAgencyContext, requireUser } from "@/server/auth/context";
import {
  deleteEmptyManualJob,
  getJob,
  updateDraftJob,
} from "@/server/services/jobs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = requestId(request.headers);
  try {
    const route = await params;
    const { supabase } = await requireUser();
    return ok(await getJob(supabase, route.id), {
      headers: { "x-request-id": id },
    });
  } catch (error) {
    return apiError(error, id);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = requestId(request.headers);
  try {
    const route = await params;
    const { supabase, agencyId } = await requireAgencyContext(request);
    return ok(await deleteEmptyManualJob(supabase, agencyId, route.id, id), {
      headers: { "x-request-id": id },
    });
  } catch (error) {
    return apiError(error, id);
  }
}

export async function PATCH(
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
      "recruiter",
    ]);
    return ok(
      await updateDraftJob(
        supabase,
        agencyId,
        route.id,
        await readJson(request),
        request.headers.get("x-expected-updated-at") ?? "",
        id,
      ),
      { headers: { "x-request-id": id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
