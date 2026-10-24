import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";

export async function listApplications(
  supabase: SupabaseClient,
  agencyId: string,
  options?: { jobId?: string | null; cursor?: string | null },
) {
  let query = supabase
    .from("applications")
    .select(
      "id,status,processing_status,source,submitted_at,cover_note,candidates(id,full_name,email,phone),jobs(id,title,public_slug,clients(name)),candidate_documents(id,file_name,content_type,size_bytes)",
    )
    .eq("agency_id", agencyId)
    .order("submitted_at", { ascending: false })
    .limit(26);
  if (options?.jobId) query = query.eq("job_id", options.jobId);
  if (options?.cursor) query = query.lt("submitted_at", options.cursor);
  const { data, error } = await query;
  if (error) {
    throw new ApiError(
      500,
      "APPLICATION_LIST_FAILED",
      "Applications could not be loaded.",
    );
  }
  const items = (data?.slice(0, 25) ?? []).map((application) => {
    const candidate = Array.isArray(application.candidates)
      ? (application.candidates[0] ?? null)
      : application.candidates;
    const rawJob = Array.isArray(application.jobs)
      ? (application.jobs[0] ?? null)
      : application.jobs;
    const job = rawJob
      ? {
          ...rawJob,
          clients: Array.isArray(rawJob.clients)
            ? (rawJob.clients[0] ?? null)
            : rawJob.clients,
        }
      : null;
    return { ...application, candidates: candidate, jobs: job };
  });
  return {
    items,
    nextCursor: data && data.length > 25 ? data[24]?.submitted_at : null,
  };
}

export async function createCandidateDocumentUrl(
  supabase: SupabaseClient,
  agencyId: string,
  applicationId: string,
  documentId: string,
) {
  const { data, error } = await supabase
    .from("candidate_documents")
    .select("storage_path,file_name")
    .eq("agency_id", agencyId)
    .eq("application_id", applicationId)
    .eq("id", documentId)
    .single();
  if (error || !data) {
    throw new ApiError(
      404,
      "DOCUMENT_NOT_FOUND",
      "The candidate document was not found.",
    );
  }
  const admin = createAdminClient();
  const signed = await admin.storage
    .from("candidate-documents")
    .createSignedUrl(data.storage_path, 60, { download: data.file_name });
  if (signed.error || !signed.data) {
    throw new ApiError(
      503,
      "DOCUMENT_URL_FAILED",
      "The resume could not be opened.",
    );
  }
  return { url: signed.data.signedUrl, expiresIn: 60 };
}
