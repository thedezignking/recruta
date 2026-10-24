import { apiError, ok, requestId } from "@/lib/api";
import { requireUser } from "@/server/auth/context";
import { deleteEmptyManualJob, getJob } from "@/server/services/jobs";

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
    const { supabase } = await requireUser();
    return ok(await deleteEmptyManualJob(supabase, route.id, id), {
      headers: { "x-request-id": id },
    });
  } catch (error) {
    return apiError(error, id);
  }
}
