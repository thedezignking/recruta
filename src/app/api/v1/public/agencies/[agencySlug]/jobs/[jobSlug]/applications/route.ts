import { apiError, ok, requestId } from "@/lib/api";
import { submitPublicApplication } from "@/server/services/public-jobs";
import { readApplicationForm } from "@/lib/public-intake";
import { z } from "zod";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ agencySlug: string; jobSlug: string }> },
) {
  const id = requestId(request.headers);
  try {
    const { agencySlug, jobSlug } = await params;
    const formData = await readApplicationForm(request);
    if (formData.get("website")) {
      return ok({ applicationId: crypto.randomUUID() }, { status: 201 });
    }
    const key = z.uuid().parse(request.headers.get("Idempotency-Key"));
    const address =
      request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    return ok(
      await submitPublicApplication(agencySlug, jobSlug, formData, {
        key,
        address,
      }),
      {
        status: 201,
        headers: { "x-request-id": id },
      },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
