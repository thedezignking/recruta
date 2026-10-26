import { apiError, ok, requestId } from "@/lib/api";
import { getDeliveryEnv } from "@/lib/env";
import { requireWorker } from "@/server/auth/worker";
import { processNextCandidateMessage } from "@/server/services/candidate-messages";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  const id = requestId(request.headers);
  try {
    requireWorker(request, getDeliveryEnv().workerSecret);
    return ok(await processNextCandidateMessage(), {
      headers: { "cache-control": "no-store", "x-request-id": id },
    });
  } catch (error) {
    return apiError(error, id);
  }
}
