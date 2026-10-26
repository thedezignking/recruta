import { timingSafeEqual } from "node:crypto";
import { apiError, ApiError, ok, requestId } from "@/lib/api";
import { getScreeningEnv } from "@/lib/env";
import { processNextScreeningRun } from "@/server/services/screening";

export const runtime = "nodejs";
export const maxDuration = 240;

export async function POST(request: Request) {
  const id = requestId(request.headers);
  try {
    const expected = getScreeningEnv().workerSecret;
    const actual = request.headers.get("authorization") ?? "";
    const expectedHeader = Buffer.from(`Bearer ${expected}`);
    const suppliedHeader = Buffer.from(actual);
    if (
      !expected ||
      suppliedHeader.length !== expectedHeader.length ||
      !timingSafeEqual(suppliedHeader, expectedHeader)
    ) {
      throw new ApiError(
        401,
        "WORKER_ACCESS_DENIED",
        "Worker authorization required.",
      );
    }
    return ok(await processNextScreeningRun(), {
      headers: { "x-request-id": id, "cache-control": "no-store" },
    });
  } catch (error) {
    return apiError(error, id);
  }
}
