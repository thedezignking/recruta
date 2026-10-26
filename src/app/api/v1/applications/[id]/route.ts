import { z } from "zod";
import { apiError, ok, readJson, requestId } from "@/lib/api";
import { requireAgencyContext } from "@/server/auth/context";
import {
  getApplication,
  getApplicationHistory,
  reviewApplication,
} from "@/server/services/applications";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = requestId(request.headers);
  try {
    const context = await requireAgencyContext(request);
    const applicationId = z.uuid().parse((await params).id);
    const application = await getApplication(
      context.supabase,
      context.agencyId,
      applicationId,
    );
    const history = await getApplicationHistory(
      context.supabase,
      context.agencyId,
      applicationId,
    );
    return ok(
      { application, ...history },
      { headers: { "x-request-id": id, "cache-control": "private, no-store" } },
    );
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
    const context = await requireAgencyContext(request);
    const applicationId = z.uuid().parse((await params).id);
    return ok(
      await reviewApplication(
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
