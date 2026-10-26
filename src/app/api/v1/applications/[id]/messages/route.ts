import { z } from "zod";
import { apiError, ok, readJson, requestId } from "@/lib/api";
import { requireAgencyContext } from "@/server/auth/context";
import {
  listCandidateMessages,
  queueCandidateMessage,
} from "@/server/services/candidate-messages";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Context) {
  const id = requestId(request.headers);
  try {
    const c = await requireAgencyContext(request);
    return ok(
      await listCandidateMessages(
        c.supabase,
        c.agencyId,
        z.uuid().parse((await params).id),
      ),
      { headers: { "cache-control": "private, no-store", "x-request-id": id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
export async function POST(request: Request, { params }: Context) {
  const id = requestId(request.headers);
  try {
    const c = await requireAgencyContext(request);
    return ok(
      await queueCandidateMessage(
        c.supabase,
        c.agencyId,
        z.uuid().parse((await params).id),
        await readJson(request),
        request.headers.get("idempotency-key"),
        id,
      ),
      { status: 202 },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
