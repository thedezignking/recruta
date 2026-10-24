import { apiError, ok, requestId } from "@/lib/api";
import { submitPublicApplication } from "@/server/services/public-jobs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ agencySlug: string; jobSlug: string }> },
) {
  const id = requestId(request.headers);
  try {
    const { agencySlug, jobSlug } = await params;
    const formData = await request.formData();
    if (formData.get("website")) {
      return ok({ applicationId: crypto.randomUUID() }, { status: 201 });
    }
    return ok(await submitPublicApplication(agencySlug, jobSlug, formData), {
      status: 201,
      headers: { "x-request-id": id },
    });
  } catch (error) {
    return apiError(error, id);
  }
}
