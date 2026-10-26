import { z } from "zod";
import { apiError, ok, readJson, requestId } from "@/lib/api";
import { requireAgencyContext } from "@/server/auth/context";
import {
  getScreeningRuns,
  requestScreening,
} from "@/server/services/screening";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  const id = requestId(request.headers);
  try {
    const context = await requireAgencyContext(request);
    const applicationId = z.uuid().parse((await params).id);
    return ok(
      await getScreeningRuns(context.supabase, context.agencyId, applicationId),
      { headers: { "x-request-id": id, "cache-control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}

export async function POST(request: Request, { params }: Context) {
  const id = requestId(request.headers);
  try {
    const context = await requireAgencyContext(request);
    const applicationId = z.uuid().parse((await params).id);
    return ok(
      await requestScreening(
        context.supabase,
        context.agencyId,
        applicationId,
        await readJson(request),
        request.headers.get("idempotency-key"),
        id,
      ),
      {
        status: 202,
        headers: { "x-request-id": id, "cache-control": "private, no-store" },
      },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
