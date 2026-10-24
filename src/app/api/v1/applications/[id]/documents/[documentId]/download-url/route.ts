import { apiError, ok, requestId } from "@/lib/api";
import { requireAgencyContext } from "@/server/auth/context";
import { createCandidateDocumentUrl } from "@/server/services/applications";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> },
) {
  const requestIdentifier = requestId(request.headers);
  try {
    const route = await params;
    const { supabase, agencyId } = await requireAgencyContext(request);
    return ok(
      await createCandidateDocumentUrl(
        supabase,
        agencyId,
        route.id,
        route.documentId,
      ),
      { headers: { "x-request-id": requestIdentifier } },
    );
  } catch (error) {
    return apiError(error, requestIdentifier);
  }
}
