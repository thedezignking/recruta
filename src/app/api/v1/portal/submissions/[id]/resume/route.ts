import { apiError, ok, requestId, ApiError } from "@/lib/api";
import { requireClientContext } from "@/server/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rid = requestId(request.headers);
  try {
    const c = await requireClientContext(request);
    const { id } = await params;
    const { data: s, error } = await c.supabase
      .from("candidate_submissions")
      .select("id,document_id,application_id,jobs!inner(client_id)")
      .eq("id", id)
      .eq("agency_id", c.agencyId)
      .eq("jobs.client_id", c.clientId)
      .is("withdrawn_at", null)
      .maybeSingle();
    if (error || !s?.document_id)
      throw new ApiError(
        404,
        "RESUME_UNAVAILABLE",
        "This résumé is not shared with you.",
      );
    const admin = createAdminClient();
    const { data: d, error: de } = await admin
      .from("candidate_documents")
      .select("storage_path,file_name")
      .eq("id", s.document_id)
      .eq("application_id", s.application_id)
      .eq("agency_id", c.agencyId)
      .single();
    if (de || !d)
      throw new ApiError(
        404,
        "RESUME_UNAVAILABLE",
        "This résumé is unavailable.",
      );
    const { data: signed, error: se } = await admin.storage
      .from("candidate-documents")
      .createSignedUrl(d.storage_path, 60, { download: d.file_name });
    if (se || !signed)
      throw new ApiError(
        503,
        "RESUME_UNAVAILABLE",
        "A download link could not be created.",
      );
    return ok(
      { downloadUrl: signed.signedUrl },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (e) {
    return apiError(e, rid);
  }
}
