import { timingSafeEqual } from "node:crypto";
import { ApiError } from "@/lib/api";
export function requireWorker(request: Request, secret: string | undefined) {
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (
    !secret ||
    actual.length !== expected.length ||
    !timingSafeEqual(actual, expected)
  )
    throw new ApiError(
      401,
      "WORKER_ACCESS_DENIED",
      "Worker authorization required.",
    );
}
