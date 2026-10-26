import { z } from "zod";
import { apiError, ok, readJson, requestId } from "@/lib/api";
import { requireAgencyContext } from "@/server/auth/context";
import { correctScreening } from "@/server/services/screening";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = requestId(request.headers);
  try {
    const c = await requireAgencyContext(request);
    return ok(
      await correctScreening(
        c.supabase,
        c.agencyId,
        z.uuid().parse((await params).id),
        await readJson(request),
        id,
      ),
    );
  } catch (error) {
    return apiError(error, id);
  }
}
